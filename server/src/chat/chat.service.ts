import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRecord, ChatSchema } from './schemas/chat.schema';
import { DocumentsService } from '../documents/documents.service';
import { AgentsService } from '../agents/agents.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSchema.name)
    private readonly chatModel: Model<ChatRecord>,
    private readonly documentsService: DocumentsService,
    private readonly agentsService: AgentsService,
  ) {}

  /**
   * Handle a user question — full agent pipeline:
   * Input Guardrail → Router Agent → Specialized Agent → Output Guardrail → Persist
   */
  async askQuestion(
    documentId: string,
    dto: AskQuestionDto,
  ): Promise<{
    answer: string;
    agentUsed: string;
    routingDecision: any;
    toolCallsLog: any[];
    blocked: boolean;
    blockReason?: string;
    groundingScore?: number;
    chatId: string;
  }> {
    // Validate document exists and is ready
    const doc = await this.documentsService.findById(documentId);

    if (doc.status === 'analyzing') {
      throw new BadRequestException(
        'Document is still being analyzed. Please wait and try again.',
      );
    }
    if (doc.status === 'error') {
      throw new BadRequestException(
        `Document analysis failed: ${doc.errorMessage || 'Unknown error'}`,
      );
    }
    if (doc.status !== 'ready') {
      throw new BadRequestException('Document is not ready for Q&A yet.');
    }

    // If rawText is empty, the PDF extraction failed silently
    if (!doc.rawText || doc.rawText.trim().length === 0) {
      throw new BadRequestException(
        'Document text could not be extracted. Please delete this document and re-upload the PDF.',
      );
    }

    // Run the full multi-agent pipeline
    const pipelineResult = await this.agentsService.runAgentPipeline(
      dto.question,
      doc.rawText,
      doc.chunks,
      doc.documentType,
    );

    // Persist the interaction
    const chatRecord = await this.chatModel.create({
      documentId: new Types.ObjectId(documentId),
      question: dto.question,
      answer: pipelineResult.answer,
      agentUsed: pipelineResult.agentUsed,
      routingDecision: pipelineResult.routingDecision,
      toolCallsLog: pipelineResult.toolCallsLog,
      blocked: pipelineResult.blocked,
      blockReason: pipelineResult.blockReason,
    });

    return {
      answer: pipelineResult.answer,
      agentUsed: pipelineResult.agentUsed,
      routingDecision: pipelineResult.routingDecision,
      toolCallsLog: pipelineResult.toolCallsLog,
      blocked: pipelineResult.blocked,
      blockReason: pipelineResult.blockReason,
      groundingScore: pipelineResult.groundingScore,
      chatId: chatRecord._id.toString(),
    };
  }

  /**
   * Get chat history for a document
   */
  async getChatHistory(documentId: string): Promise<ChatRecord[]> {
    // Verify document exists
    await this.documentsService.findById(documentId);

    return this.chatModel
      .find({ documentId: new Types.ObjectId(documentId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Clear chat history for a document
   */
  async clearHistory(documentId: string): Promise<{ deletedCount: number }> {
    const result = await this.chatModel
      .deleteMany({ documentId: new Types.ObjectId(documentId) })
      .exec();
    return { deletedCount: result.deletedCount };
  }
}
