import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsModule } from './documents/documents.module';
import { AgentsModule } from './agents/agents.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        connectionFactory: (connection) => {
          connection.on('connected', () =>
            console.log('✅ MongoDB connected successfully'),
          );
          connection.on('error', (err) =>
            console.error('❌ MongoDB connection error:', err),
          );
          return connection;
        },
      }),
    }),
    DocumentsModule,
    AgentsModule,
    ChatModule,
  ],
})
export class AppModule {}
