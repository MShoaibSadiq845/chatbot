'use client';

import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Paper,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useUploadDocumentMutation } from '@/lib/api/documentsApi';
import toast from 'react-hot-toast';

interface PdfUploadProps {
  onDocumentUploaded: (documentId: string) => void;
}

export function PdfUpload({ onDocumentUploaded }: PdfUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDocument, { isLoading }] = useUploadDocumentMutation();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast.error('Only PDF files are allowed');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    const toastId = toast.loading('Uploading and starting analysis pipeline...');
    try {
      const result = await uploadDocument(formData).unwrap();
      toast.success(`"${selectedFile.name}" uploaded! Analysis started.`, { id: toastId });
      onDocumentUploaded(result.documentId);
      setSelectedFile(null);
    } catch {
      toast.error('Upload failed. Please check the file and try again.', { id: toastId });
    }
  };

  return (
    <Box>
      <Paper
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        sx={{
          border: `2px dashed ${dragOver ? '#6C63FF' : 'rgba(108,99,255,0.3)'}`,
          borderRadius: 3,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: dragOver ? 'rgba(108,99,255,0.08)' : 'rgba(108,99,255,0.02)',
          '&:hover': { borderColor: '#6C63FF', background: 'rgba(108,99,255,0.05)' },
        }}
        onClick={() => document.getElementById('pdf-input')?.click()}
      >
        <input id="pdf-input" type="file" accept="application/pdf" hidden onChange={handleFileInput} />
        <CloudUploadIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.8, mb: 1 }} />
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
          Drag &amp; drop your PDF here
        </Typography>
        <Typography variant="caption" color="text.secondary">
          or click to browse — max 20MB
        </Typography>
      </Paper>

      {selectedFile && (
        <Box sx={{ mt: 2, p: 2, borderRadius: 2, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <PictureAsPdfIcon color="error" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Box>
          <Chip label="PDF" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        </Box>
      )}

      {isLoading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Uploading and starting analysis pipeline...
          </Typography>
          <LinearProgress color="primary" />
        </Box>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!selectedFile || isLoading}
        onClick={handleUpload}
        startIcon={<CloudUploadIcon />}
        sx={{ mt: 3, py: 1.5, fontSize: '1rem', borderRadius: 2 }}
      >
        {isLoading ? 'Uploading...' : 'Upload & Analyze'}
      </Button>

      <Box sx={{ mt: 3, p: 2, borderRadius: 2, background: 'rgba(0,191,165,0.05)', border: '1px solid rgba(0,191,165,0.2)' }}>
        <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          Multi-Agent Pipeline
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Document Analysis Agent → extracts text, identifies type, sections &amp; entities using real PDF tools
        </Typography>
      </Box>
    </Box>
  );
}
