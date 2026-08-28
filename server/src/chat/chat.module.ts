import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSchema, ChatSchemaModel } from './schemas/chat.schema';
import { DocumentsModule } from '../documents/documents.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSchema.name, schema: ChatSchemaModel },
    ]),
    DocumentsModule,
    AgentsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
