import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentRecord, DocumentSchema } from './schemas/document.schema';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentSchema.name)
    private readonly documentModel: Model<DocumentRecord>,
    private readonly agentsService: AgentsService,
  ) {}

  /**
   * Upload and trigger async analysis of a PDF document.
   * Returns immediately with a pending document record.
   */
  async uploadDocument(
    file: Express.Multer.File,
  ): Promise<DocumentRecord> {
    // Create a pending document record first
    const doc = await this.documentModel.create({
      filename: file.originalname,
      originalName: file.originalname,
      rawText: '',
      chunks: [],
      documentType: 'unknown',
      status: 'analyzing',
      analysis: {},
    });

    // Kick off analysis asynchronously
    this.runAnalysis(doc._id.toString(), file.buffer).catch((err) => {
      console.error(`[DocumentsService] Analysis failed for ${doc._id}:`, err);
    });

    return doc;
  }

  private async runAnalysis(docId: string, buffer: Buffer): Promise<void> {
    try {
      const result = await this.agentsService.analyzeDocument(buffer);

      await this.documentModel.findByIdAndUpdate(docId, {
        rawText: result.rawText,
        chunks: result.chunks,
        documentType: result.documentType,
        status: 'ready',
        analysis: {
          documentType: result.documentType,
          sections: result.sections,
          themes: result.themes,
          entities: result.entities,
          wordCount: result.wordCount,
          pageCount: result.pageCount,
          summary: '',
          bulletHighlights: [],
        },
      });

      console.log(`[DocumentsService] Analysis complete for doc: ${docId}`);
    } catch (err: any) {
      await this.documentModel.findByIdAndUpdate(docId, {
        status: 'error',
        errorMessage: err?.message || 'Unknown error',
      });
      throw err;
    }
  }

  async findAll(): Promise<DocumentRecord[]> {
    return this.documentModel
      .find()
      .select('-rawText -chunks') // Exclude large fields from list
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<DocumentRecord> {
    const doc = await this.documentModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async deleteDocument(id: string): Promise<void> {
    const result = await this.documentModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Document ${id} not found`);
  }

  /**
   * Poll document status — used by frontend to check when analysis is ready.
   */
  async getStatus(
    id: string,
  ): Promise<{ status: string; documentType?: string; analysis?: any }> {
    const doc = await this.documentModel
      .findById(id)
      .select('status documentType analysis errorMessage')
      .exec();
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return {
      status: doc.status,
      documentType: doc.documentType,
      analysis: doc.analysis,
    };
  }
}
