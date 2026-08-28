import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongoDocument, Types } from 'mongoose';

export type ChatRecord = MongoDocument & ChatSchema;

@Schema({ timestamps: true })
export class ChatSchema {
  @Prop({ type: Types.ObjectId, ref: 'DocumentSchema', required: true })
  documentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: String, required: true })
  answer: string;

  @Prop({ type: String, default: 'qa' })
  agentUsed: string; // router | analysis | summary | qa

  @Prop({
    type: {
      selectedAgent: { type: String },
      reasoning: { type: String },
      intent: { type: String },
    },
    default: {},
  })
  routingDecision: {
    selectedAgent: string;
    reasoning: string;
    intent: string;
  };

  @Prop({
    type: [
      {
        toolName: { type: String },
        input: { type: Object },
        output: { type: Object },
      },
    ],
    default: [],
  })
  toolCallsLog: {
    toolName: string;
    input: any;
    output: any;
  }[];

  @Prop({ type: Boolean, default: false })
  blocked: boolean;

  @Prop({ type: String })
  blockReason: string;
}

export const ChatSchemaModel = SchemaFactory.createForClass(ChatSchema);