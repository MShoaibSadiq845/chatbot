import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface DocumentAnalysis {
  documentType: string;
  sections: string[];
  themes: string[];
  entities: string[];
  wordCount: number;
  pageCount: number;
  summary: string;
  bulletHighlights: string[];
}

export interface DocumentRecord {
  id: string;
  filename: string;
  documentType: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  analysis: DocumentAnalysis;
  createdAt: string;
}

export const documentsApi = createApi({
  reducerPath: 'documentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Document'],
  endpoints: (builder) => ({
    uploadDocument: builder.mutation<
      { success: boolean; documentId: string; filename: string; status: string },
      FormData
    >({
      query: (formData) => ({
        url: '/documents/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Document'],
    }),

    listDocuments: builder.query<
      { success: boolean; count: number; documents: DocumentRecord[] },
      void
    >({
      query: () => '/documents',
      providesTags: ['Document'],
    }),

    getDocument: builder.query<
      { success: boolean; document: DocumentRecord },
      string
    >({
      query: (id) => `/documents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Document', id }],
    }),

    getDocumentStatus: builder.query<
      { success: boolean; documentId: string; status: string; documentType?: string; analysis?: DocumentAnalysis },
      string
    >({
      query: (id) => `/documents/${id}/status`,
    }),

    deleteDocument: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Document'],
    }),
  }),
});

export const {
  useUploadDocumentMutation,
  useListDocumentsQuery,
  useGetDocumentQuery,
  useGetDocumentStatusQuery,
  useDeleteDocumentMutation,
} = documentsApi;
