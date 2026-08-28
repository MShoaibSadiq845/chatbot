import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface RoutingDecision {
  selectedAgent: string;
  reasoning: string;
  intent: string;
}

export interface ToolCallLog {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  agentUsed: string;
  routingDecision: RoutingDecision;
  toolCallsLog: ToolCallLog[];
  blocked: boolean;
  blockReason?: string;
  createdAt: string;
}

export interface AskResponse {
  success: boolean;
  documentId: string;
  question: string;
  answer: string;
  agentUsed: string;
  routingDecision: RoutingDecision;
  toolCallsLog: ToolCallLog[];
  blocked: boolean;
  blockReason?: string;
  groundingScore?: number;
  chatId: string;
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Chat'],
  endpoints: (builder) => ({
    askQuestion: builder.mutation<
      AskResponse,
      { documentId: string; question: string }
    >({
      query: ({ documentId, question }) => ({
        url: `/documents/${documentId}/chat/ask`,
        method: 'POST',
        body: { question },
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: 'Chat', id: documentId },
      ],
    }),

    getChatHistory: builder.query<
      { success: boolean; count: number; history: ChatMessage[] },
      string
    >({
      query: (documentId) => `/documents/${documentId}/chat/history`,
      providesTags: (result, error, documentId) => [
        { type: 'Chat', id: documentId },
      ],
    }),

    clearChatHistory: builder.mutation<{ success: boolean }, string>({
      query: (documentId) => ({
        url: `/documents/${documentId}/chat/history`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, documentId) => [
        { type: 'Chat', id: documentId },
      ],
    }),
  }),
});

export const {
  useAskQuestionMutation,
  useGetChatHistoryQuery,
  useClearChatHistoryMutation,
} = chatApi;
