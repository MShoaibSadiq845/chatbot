import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentSchema, DocumentSchemaModel } from './schemas/document.schema';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentSchema.name, schema: DocumentSchemaModel },
    ]),
    AgentsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
