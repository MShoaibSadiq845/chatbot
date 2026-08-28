'use client';

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import {
  useListDocumentsQuery,
  useDeleteDocumentMutation,
  DocumentRecord,
} from '@/lib/api/documentsApi';
import toast from 'react-hot-toast';

interface DocumentListProps {
  selectedId: string | null;
  onSelect: (doc: DocumentRecord) => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ready: <CheckCircleIcon sx={{ fontSize: 14, color: '#00E676' }} />,
  analyzing: <HourglassEmptyIcon sx={{ fontSize: 14, color: '#FFD740' }} />,
  error: <ErrorIcon sx={{ fontSize: 14, color: '#FF5252' }} />,
  pending: <HourglassEmptyIcon sx={{ fontSize: 14, color: '#9E9E9E' }} />,
};

const DOCTYPE_SHORT: Record<string, string> = {
  research_paper: 'Research',
  business_report: 'Business',
  legal_policy: 'Legal',
  manual_guide: 'Manual',
  other: 'Other',
  unknown: '...',
};

export function DocumentList({ selectedId, onSelect }: DocumentListProps) {
  const { data, isLoading, error } = useListDocumentsQuery(undefined, {
    pollingInterval: 3000,
  });
  const [deleteDocument] = useDeleteDocumentMutation();

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    toast(
      (t) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Delete &quot;{name}&quot;?</Typography>
          <Typography variant="caption" color="text.secondary">This will also remove its chat history.</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const deleteToast = toast.loading('Deleting document...');
                try {
                  await deleteDocument(id);
                  toast.success('Document deleted.', { id: deleteToast });
                } catch {
                  toast.error('Failed to delete document.', { id: deleteToast });
                }
              }}
              style={{ background: '#FF5252', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#ccc', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
          </Box>
        </Box>
      ),
      { duration: 8000 }
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ px: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={56} sx={{ borderRadius: 2, mb: 1 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mx: 1, borderRadius: 2, fontSize: '0.75rem' }}>
        Failed to load documents
      </Alert>
    );
  }

  const docs = data?.documents || [];

  if (docs.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
        <PictureAsPdfIcon sx={{ fontSize: 40, color: 'rgba(108,99,255,0.3)', mb: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          No documents yet.
          <br />
          Upload a PDF to begin.
        </Typography>
      </Box>
    );
  }

  return (
    <List dense disablePadding>
      {docs.map((doc) => (
        <ListItemButton
          key={doc.id}
          selected={selectedId === doc.id}
          onClick={() => onSelect(doc)}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            mx: 0.5,
            py: 1,
            '&.Mui-selected': {
              background: 'rgba(108,99,255,0.15)',
              borderLeft: '3px solid #6C63FF',
              '&:hover': { background: 'rgba(108,99,255,0.2)' },
            },
            '&:hover': { background: 'rgba(108,99,255,0.07)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <PictureAsPdfIcon sx={{ fontSize: 18, color: '#FF5252' }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                noWrap
                sx={{ fontSize: '0.8rem', fontWeight: selectedId === doc.id ? 700 : 500 }}
              >
                {doc.filename}
              </Typography>
            }
            secondary={
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                {STATUS_ICON[doc.status] || STATUS_ICON.pending}
                <Typography component="span" variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  {doc.status === 'ready'
                    ? DOCTYPE_SHORT[doc.documentType] || doc.documentType
                    : doc.status}
                </Typography>
              </Box>
            }
          />
          <Tooltip title="Delete document">
            <IconButton
              size="small"
              onClick={(e) => handleDelete(e, doc.id, doc.filename)}
              sx={{ opacity: 0, '.MuiListItemButton-root:hover &': { opacity: 1 }, color: 'error.main', p: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </ListItemButton>
      ))}
    </List>
  );
}
