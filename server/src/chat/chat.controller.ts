import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@Controller('documents/:documentId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/documents/:documentId/chat/ask
   * Full pipeline: Input Guardrail → Router → Agent → Output Guardrail
   */
  @Post('ask')
  @HttpCode(HttpStatus.OK)
  async askQuestion(
    @Param('documentId') documentId: string,
    @Body() dto: AskQuestionDto,
  ) {
    const result = await this.chatService.askQuestion(documentId, dto);
    return {
      success: true,
      documentId,
      question: dto.question,
      answer: result.answer,
      agentUsed: result.agentUsed,
      routingDecision: result.routingDecision,
      toolCallsLog: result.toolCallsLog,
      blocked: result.blocked,
      blockReason: result.blockReason,
      groundingScore: result.groundingScore,
      chatId: result.chatId,
    };
  }

  /**
   * GET /api/documents/:documentId/chat/history
   * Retrieve full conversation history
   */
  @Get('history')
  async getChatHistory(@Param('documentId') documentId: string) {
    const history = await this.chatService.getChatHistory(documentId);
    return {
      success: true,
      documentId,
      count: history.length,
      history: history.map((h) => ({
        id: h._id.toString(),
        question: h.question,
        answer: h.answer,
        agentUsed: h.agentUsed,
        routingDecision: h.routingDecision,
        toolCallsLog: h.toolCallsLog,
        blocked: h.blocked,
        blockReason: h.blockReason,
        createdAt: (h as any).createdAt,
      })),
    };
  }

  /**
   * DELETE /api/documents/:documentId/chat/history
   * Clear conversation history
   */
  @Delete('history')
  @HttpCode(HttpStatus.OK)
  async clearHistory(@Param('documentId') documentId: string) {
    const result = await this.chatService.clearHistory(documentId);
    return {
      success: true,
      message: `Cleared ${result.deletedCount} messages`,
    };
  }
}
