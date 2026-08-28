'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Drawer,
  AppBar,
  Toolbar,
  Divider,
  Tab,
  Tabs,
  Chip,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MenuIcon from '@mui/icons-material/Menu';
import { PdfUpload } from '@/components/PdfUpload';
import { DocumentList } from '@/components/DocumentList';
import { UploadResultPage } from '@/components/UploadResultPage';
import { ChatInterface } from '@/components/ChatInterface';
import {
  DocumentRecord,
  DocumentAnalysis as AnalysisType,
  useListDocumentsQuery,
  useGetDocumentStatusQuery,
} from '@/lib/api/documentsApi';

const DRAWER_WIDTH = 260;

function DocumentWorkspace({
  docId,
  filename,
  onUploadAnother,
}: {
  docId: string;
  filename: string;
  onUploadAnother: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const { data } = useGetDocumentStatusQuery(docId, { pollingInterval: 2000 });
  const isReady = data?.status === 'ready';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: '1px solid rgba(108,99,255,0.12)', background: '#13131F', px: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', minHeight: 48 },
            '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #6C63FF, #9D96FF)', height: 3, borderRadius: 2 },
          }}
        >
          <Tab label="🔬 Analysis" />
          <Tab label="💬 Ask Questions" disabled={!isReady} sx={{ '&.Mui-disabled': { opacity: 0.4 } }} />
        </Tabs>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && (
          <UploadResultPage
            documentId={docId}
            filename={filename}
            onStartChat={() => setActiveTab(1)}
            onUploadAnother={onUploadAnother}
          />
        )}
        {activeTab === 1 && (
          <Box sx={{ p: 3, height: '100%', boxSizing: 'border-box' }}>
            <ChatInterface documentId={docId} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [view, setView] = useState<'welcome' | 'document'>('welcome');
  const { refetch } = useListDocumentsQuery();

  const handleDocumentUploaded = useCallback(
    (documentId: string) => {
      refetch();
      setSelectedDoc({
        id: documentId,
        filename: 'Your Document',
        documentType: 'unknown',
        status: 'analyzing',
        analysis: {} as AnalysisType,
        createdAt: new Date().toISOString(),
      });
      setView('document');
    },
    [refetch],
  );

  const handleSelectDoc = useCallback(
    (doc: DocumentRecord) => {
      setSelectedDoc(doc);
      setView('document');
      if (isMobile) setMobileDrawerOpen(false);
    },
    [isMobile],
  );

  const handleUploadAnother = useCallback(() => {
    setSelectedDoc(null);
    setView('welcome');
  }, []);

  // Sidebar: only document list, no upload form
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Documents
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(108,99,255,0.1)', mb: 1 }} />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <DocumentList selectedId={selectedDoc?.id || null} onSelect={handleSelectDoc} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0F0F1A' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'rgba(15,15,26,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(108,99,255,0.15)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileDrawerOpen(true)} sx={{ color: 'primary.main' }}>
              <MenuIcon />
            </IconButton>
          )}
          <SmartToyIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
              Smart Document Intelligence
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
              Multi-Agent PDF Analysis System
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.75, alignItems: 'center' }}>
            {['Router', 'Analysis', 'Summary', 'Q&A'].map((agent) => (
              <Chip
                key={agent} label={agent} size="small" variant="outlined"
                sx={{ fontSize: '0.65rem', borderColor: 'rgba(108,99,255,0.3)', color: 'primary.light', height: 22 }}
              />
            ))}
            <Chip
              label="Guardrails ✓" size="small"
              sx={{ fontSize: '0.65rem', background: 'rgba(0,230,118,0.1)', color: '#00E676', border: '1px solid rgba(0,230,118,0.2)', height: 22 }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar — documents only */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileDrawerOpen : true}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            background: '#13131F',
            borderRight: '1px solid rgba(108,99,255,0.12)',
            mt: isMobile ? 0 : '64px',
            height: isMobile ? '100%' : 'calc(100% - 64px)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          mt: '64px',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Welcome: upload form in center ── */}
        {view === 'welcome' && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 4,
              p: { xs: 2, md: 6 },
              overflowY: 'auto',
            }}
          >
            {/* Hero */}
            <Box sx={{ textAlign: 'center' }}>
              <SmartToyIcon sx={{ fontSize: 64, color: 'rgba(108,99,255,0.35)', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Smart Document Intelligence
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460 }}>
                Upload a PDF and ask questions. A multi-agent system routes every request
                through guardrails, a router, and specialized agents.
              </Typography>
            </Box>

            {/* Upload form — centered, max width */}
            <Box sx={{ width: '100%', maxWidth: 480 }}>
              <PdfUpload onDocumentUploaded={handleDocumentUploaded} />
            </Box>

            {/* Pipeline chips */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: 600,
              }}
            >
              {[
                { label: '🛡 Guardrail', color: '#00BFA5' },
                { arrow: true },
                { label: '🔀 Router', color: '#9D96FF' },
                { arrow: true },
                { label: '🤖 Agent', color: '#6C63FF' },
                { arrow: true },
                { label: '🔧 Tools', color: '#FFD740' },
                { arrow: true },
                { label: '✅ Answer', color: '#00E676' },
              ].map((item, i) =>
                item.arrow ? (
                  <Typography key={i} variant="caption" color="text.secondary">→</Typography>
                ) : (
                  <Chip
                    key={i} label={item.label} size="small"
                    sx={{
                      background: `${item.color}18`, color: item.color,
                      border: `1px solid ${item.color}33`, fontSize: '0.72rem', fontWeight: 600,
                    }}
                  />
                ),
              )}
            </Box>
          </Box>
        )}

        {/* ── Document workspace ── */}
        {view === 'document' && selectedDoc && (
          <DocumentWorkspace
            docId={selectedDoc.id}
            filename={selectedDoc.filename}
            onUploadAnother={handleUploadAnother}
          />
        )}
      </Box>
    </Box>
  );
}
