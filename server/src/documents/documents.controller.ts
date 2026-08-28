import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ── Static routes FIRST (no param segments) ──────────────────────────────

  /**
   * POST /api/documents/upload
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const doc = await this.documentsService.uploadDocument(file);
    return {
      success: true,
      message: 'Document uploaded. Analysis started.',
      documentId: doc._id.toString(),
      filename: doc.originalName,
      status: doc.status,
    };
  }

  /**
   * GET /api/documents
   */
  @Get()
  async listDocuments() {
    const docs = await this.documentsService.findAll();
    return {
      success: true,
      count: docs.length,
      documents: docs.map((d) => ({
        id: d._id.toString(),
        filename: d.originalName,
        documentType: d.documentType,
        status: d.status,
        analysis: d.analysis,
        createdAt: (d as any).createdAt,
      })),
    };
  }

  // ── Param + sub-path routes BEFORE generic :id ────────────────────────────

  /**
   * GET /api/documents/:id/status
   * MUST be before @Get(':id') — NestJS matches top-to-bottom
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const status = await this.documentsService.getStatus(id);
    return { success: true, documentId: id, ...status };
  }

  // ── Generic param routes LAST ─────────────────────────────────────────────

  /**
   * GET /api/documents/:id
   */
  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const doc = await this.documentsService.findById(id);
    return {
      success: true,
      document: {
        id: doc._id.toString(),
        filename: doc.originalName,
        documentType: doc.documentType,
        status: doc.status,
        analysis: doc.analysis,
        createdAt: (doc as any).createdAt,
      },
    };
  }

  /**
   * DELETE /api/documents/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteDocument(@Param('id') id: string) {
    await this.documentsService.deleteDocument(id);
    return { success: true, message: 'Document deleted' };
  }
}
