import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongoDocument } from 'mongoose';

export type DocumentRecord = MongoDocument & DocumentSchema;

@Schema({ timestamps: true })
export class DocumentSchema {
  @Prop({ type: String, required: true })
  filename: string;

  @Prop({ type: String, required: true })
  originalName: string;

  @Prop({ type: String, default: '' })
  rawText: string;

  @Prop({ type: [String], default: [] })
  chunks: string[];

  @Prop({ type: String, default: 'unknown' })
  documentType: string;

  @Prop({
    type: {
      documentType: { type: String },
      sections: { type: [String], default: [] },
      themes: { type: [String], default: [] },
      entities: { type: [String], default: [] },
      summary: { type: String },
      bulletHighlights: { type: [String], default: [] },
      wordCount: { type: Number },
      pageCount: { type: Number },
    },
    default: {},
  })
  analysis: {
    documentType: string;
    sections: string[];
    themes: string[];
    entities: string[];
    summary: string;
    bulletHighlights: string[];
    wordCount: number;
    pageCount: number;
  };

  @Prop({ type: String, default: 'pending' })
  status: string; // pending | analyzing | ready | error

  @Prop({ type: String })
  errorMessage: string;
}

export const DocumentSchemaModel = SchemaFactory.createForClass(DocumentSchema);