'use client';

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Paper,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import PersonIcon from '@mui/icons-material/Person';
import {
  useGetDocumentStatusQuery,
  DocumentAnalysis as AnalysisType,
} from '@/lib/api/documentsApi';

interface DocumentAnalysisProps {
  documentId: string;
  onReady?: (analysis: AnalysisType) => void;
}

const DOCTYPE_LABELS: Record<string, string> = {
  research_paper: '📄 Research Paper',
  business_report: '📊 Business Report',
  legal_policy: '⚖️ Legal / Policy',
  manual_guide: '📖 Manual / Guide',
  other: '📃 Other',
  unknown: '⏳ Identifying...',
};

const DOCTYPE_COLORS: Record<string, 'primary' | 'secondary' | 'warning' | 'info' | 'error'> = {
  research_paper: 'primary',
  business_report: 'secondary',
  legal_policy: 'warning',
  manual_guide: 'info',
  other: 'error',
};

export function DocumentAnalysis({ documentId, onReady }: DocumentAnalysisProps) {
  const { data, isLoading, error } = useGetDocumentStatusQuery(documentId, {
    pollingInterval: 2000,
  });

  const status = data?.status;
  const analysis = data?.analysis;

  useEffect(() => {
    if (status === 'ready' && analysis && onReady) {
      onReady(analysis);
    }
  }, [status, analysis, onReady]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading analysis...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 2 }}>Failed to load document status.</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Document Analysis
        </Typography>
        <Chip
          label={
            status === 'ready' ? '✓ Ready' :
            status === 'analyzing' ? '⚙ Analyzing...' :
            status === 'error' ? '✗ Error' : status
          }
          color={status === 'ready' ? 'success' : status === 'analyzing' ? 'warning' : 'error'}
          size="small"
          variant="outlined"
        />
      </Box>

      {status === 'analyzing' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Document Analysis Agent is running tools: extractPdfText → countTokens → LLM classification...
          </Typography>
          <LinearProgress color="primary" />
        </Box>
      )}

      {status === 'error' && (
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          Analysis failed. Please try uploading again.
        </Alert>
      )}

      {status === 'ready' && analysis && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Document Type */}
          <Paper sx={{ p: 2, background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CategoryIcon fontSize="small" color="primary" />
              <Typography variant="caption" color="primary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Document Type
              </Typography>
            </Box>
            <Chip
              label={DOCTYPE_LABELS[analysis.documentType] || analysis.documentType}
              color={DOCTYPE_COLORS[analysis.documentType] || 'primary'}
              variant="filled"
              sx={{ fontWeight: 600, fontSize: '0.85rem' }}
            />
            <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                📝 {analysis.wordCount?.toLocaleString() || '—'} words
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📄 {analysis.pageCount || '—'} pages
              </Typography>
            </Box>
          </Paper>

          {/* Sections + Themes side by side */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {analysis.sections?.length > 0 && (
              <Paper sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220, border: '1px solid rgba(255,255,255,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <ArticleIcon fontSize="small" color="secondary" />
                  <Typography variant="caption" color="secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Sections ({analysis.sections.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {analysis.sections.map((s, i) => (
                    <Chip key={i} label={s} size="small" variant="outlined" sx={{ fontSize: '0.7rem', borderColor: 'rgba(0,191,165,0.3)', color: 'secondary.light' }} />
                  ))}
                </Box>
              </Paper>
            )}

            {analysis.themes?.length > 0 && (
              <Paper sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220, border: '1px solid rgba(255,255,255,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <LabelIcon fontSize="small" sx={{ color: '#FFD740' }} />
                  <Typography variant="caption" sx={{ color: '#FFD740', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Themes ({analysis.themes.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {analysis.themes.map((t, i) => (
                    <Chip key={i} label={t} size="small" variant="outlined" sx={{ fontSize: '0.7rem', borderColor: 'rgba(255,215,64,0.3)', color: '#FFD740' }} />
                  ))}
                </Box>
              </Paper>
            )}
          </Box>

          {/* Entities */}
          {analysis.entities?.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonIcon fontSize="small" sx={{ color: '#FF5252' }} />
                <Typography variant="caption" sx={{ color: '#FF5252', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Key Entities ({analysis.entities.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {analysis.entities.map((e, i) => (
                  <Chip key={i} label={e} size="small" variant="filled" sx={{ fontSize: '0.7rem', background: 'rgba(255,82,82,0.12)', color: '#FF8A80' }} />
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
