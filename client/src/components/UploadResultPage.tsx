'use client';

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Button,
  Divider,
  Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ArticleIcon from '@mui/icons-material/Article';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import toast from 'react-hot-toast';
import { useGetDocumentStatusQuery, DocumentAnalysis as AnalysisType } from '@/lib/api/documentsApi';

interface UploadResultPageProps {
  documentId: string;
  filename: string;
  onStartChat: () => void;
  onUploadAnother: () => void;
}

const DOCTYPE_LABELS: Record<string, string> = {
  research_paper: 'Research Paper',
  business_report: 'Business Report',
  legal_policy: 'Legal / Policy',
  manual_guide: 'Manual / Guide',
  other: 'Other',
  unknown: 'Identifying...',
};

const DOCTYPE_COLORS: Record<string, string> = {
  research_paper: '#6C63FF',
  business_report: '#00BFA5',
  legal_policy: '#FFD740',
  manual_guide: '#40C4FF',
  other: '#FF7043',
  unknown: '#9E9E9E',
};

export function UploadResultPage({ documentId, filename, onStartChat, onUploadAnother }: UploadResultPageProps) {
  const { data, isLoading } = useGetDocumentStatusQuery(documentId, {
    pollingInterval: 2000,
  });

  const status = data?.status;
  const analysis = data?.analysis as AnalysisType | undefined;

  // Show toast when analysis completes or fails
  useEffect(() => {
    if (status === 'ready') {
      toast.success('Analysis complete! Document is ready.');
    } else if (status === 'error') {
      toast.error('Analysis failed. Try uploading the document again.');
    }
  }, [status]);

  const docColor = DOCTYPE_COLORS[analysis?.documentType || 'unknown'] || '#6C63FF';

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 } }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
        <Box
          sx={{
            width: 52, height: 52, borderRadius: 2,
            background: 'rgba(255,82,82,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <PictureAsPdfIcon sx={{ color: '#FF5252', fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, wordBreak: 'break-word' }}>
            {filename}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {status === 'analyzing' || isLoading ? (
              <Chip
                icon={<HourglassTopIcon sx={{ fontSize: '14px !important' }} />}
                label="Analyzing..."
                size="small"
                sx={{ background: 'rgba(255,215,64,0.12)', color: '#FFD740', border: '1px solid rgba(255,215,64,0.3)', fontWeight: 600 }}
              />
            ) : status === 'ready' ? (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#00E676 !important' }} />}
                label="Analysis Complete"
                size="small"
                sx={{ background: 'rgba(0,230,118,0.1)', color: '#00E676', border: '1px solid rgba(0,230,118,0.3)', fontWeight: 600 }}
              />
            ) : status === 'error' ? (
              <Chip
                icon={<ErrorOutlineIcon sx={{ fontSize: '14px !important', color: '#FF5252 !important' }} />}
                label="Analysis Failed"
                size="small"
                sx={{ background: 'rgba(255,82,82,0.1)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.3)', fontWeight: 600 }}
              />
            ) : null}
          </Box>
        </Box>
      </Box>

      {/* Analyzing state */}
      {(status === 'analyzing' || status === 'pending') && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(108,99,255,0.2)', background: 'rgba(108,99,255,0.04)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} thickness={5} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Multi-Agent Pipeline Running
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            {[
              { step: '1', label: 'extractPdfText', desc: 'Parsing PDF buffer into raw text' },
              { step: '2', label: 'countTokens', desc: 'Counting words, sentences, paragraphs' },
              { step: '3', label: 'LLM Classification', desc: 'Gemini identifying type, sections & entities' },
            ].map(({ step, label, desc }) => (
              <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'primary.light' }}>{step}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.light', fontFamily: 'monospace' }}>{label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <LinearProgress color="primary" sx={{ borderRadius: 4, height: 5 }} />
        </Paper>
      )}

      {/* Error state */}
      {status === 'error' && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(255,82,82,0.3)', background: 'rgba(255,82,82,0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ErrorOutlineIcon sx={{ color: '#FF5252' }} />
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#FF5252' }}>Analysis Failed</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The document analysis pipeline encountered an error. This can happen with scanned PDFs, password-protected files, or very large documents.
          </Typography>
          <Button variant="outlined" color="error" size="small" onClick={onUploadAnother}>
            Try Another Document
          </Button>
        </Paper>
      )}

      {/* Ready state — full results */}
      {status === 'ready' && analysis && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Document type + stats */}
          <Paper
            sx={{
              p: 3, borderRadius: 3,
              background: `linear-gradient(135deg, ${docColor}12, ${docColor}06)`,
              border: `1px solid ${docColor}33`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CategoryIcon sx={{ color: docColor, fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: docColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Document Type
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {DOCTYPE_LABELS[analysis.documentType] || analysis.documentType}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: docColor }}>
                  {analysis.wordCount?.toLocaleString() ?? '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">words</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: `${docColor}33` }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: docColor }}>
                  {analysis.pageCount ?? '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">pages</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Sections & Themes */}
          <Grid container spacing={2}>
            {analysis.sections?.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', border: '1px solid rgba(0,191,165,0.2)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ArticleIcon sx={{ color: '#00BFA5', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ color: '#00BFA5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Sections ({analysis.sections.length})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {analysis.sections.map((s, i) => (
                      <Chip
                        key={i} label={s} size="small" variant="outlined"
                        sx={{ fontSize: '0.72rem', borderColor: 'rgba(0,191,165,0.3)', color: '#80CBC4' }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}

            {analysis.themes?.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', border: '1px solid rgba(255,215,64,0.2)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LabelIcon sx={{ color: '#FFD740', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ color: '#FFD740', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Themes ({analysis.themes.length})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {analysis.themes.map((t, i) => (
                      <Chip
                        key={i} label={t} size="small" variant="outlined"
                        sx={{ fontSize: '0.72rem', borderColor: 'rgba(255,215,64,0.3)', color: '#FFE57F' }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Entities */}
          {analysis.entities?.length > 0 && (
            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(255,82,82,0.2)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon sx={{ color: '#FF5252', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: '#FF5252', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Key Entities ({analysis.entities.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {analysis.entities.map((entity, i) => (
                  <Chip
                    key={i} label={entity} size="small" variant="filled"
                    sx={{ fontSize: '0.72rem', background: 'rgba(255,82,82,0.12)', color: '#FF8A80', fontWeight: 500 }}
                  />
                ))}
              </Box>
            </Paper>
          )}

          {/* CTA */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', pt: 1 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ChatIcon />}
              onClick={onStartChat}
              sx={{ flex: 1, minWidth: 200, py: 1.5, fontWeight: 700, borderRadius: 2 }}
            >
              Ask Questions About This Document
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onUploadAnother}
              sx={{ borderRadius: 2, py: 1.5, borderColor: 'rgba(108,99,255,0.4)', color: 'primary.light' }}
            >
              Upload Another
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
