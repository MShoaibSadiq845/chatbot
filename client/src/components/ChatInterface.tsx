'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  Tooltip,
  Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BlockIcon from '@mui/icons-material/Block';
import { useAskQuestionMutation, AskResponse } from '@/lib/api/chatApi';
import { useGetDocumentStatusQuery } from '@/lib/api/documentsApi';

interface ChatInterfaceProps {
  documentId: string;
}

const AGENT_COLORS: Record<string, string> = {
  qa: '#6C63FF',
  summary: '#00BFA5',
  analysis: '#FFD740',
  router: '#9D96FF',
  guardrail: '#FF5252',
  blocked: '#FF5252',
  error: '#FF5252',
};

const AGENT_LABELS: Record<string, string> = {
  qa: '🔍 Q&A Agent',
  summary: '📝 Summary Agent',
  analysis: '🔬 Analysis Agent',
  router: '🔀 Router Agent',
  guardrail: '🛡 Guardrail',
  blocked: '🚫 Blocked',
  error: '⚠ Error',
};

function RoutingTrace({ response }: { response: AskResponse }) {
  const [open, setOpen] = useState(false);
  const agentColor = AGENT_COLORS[response.agentUsed] || '#6C63FF';

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flexWrap: 'wrap' }} onClick={() => setOpen(!open)}>
        <Chip
          label={AGENT_LABELS[response.agentUsed] || response.agentUsed}
          size="small"
          sx={{ background: `${agentColor}22`, color: agentColor, border: `1px solid ${agentColor}44`, fontWeight: 600, fontSize: '0.7rem' }}
        />
        {response.groundingScore !== undefined && !response.blocked && (
          <Chip
            label={`Grounding: ${Math.round(response.groundingScore * 100)}%`}
            size="small"
            sx={{ fontSize: '0.65rem', background: 'rgba(0,230,118,0.1)', color: '#00E676', border: '1px solid rgba(0,230,118,0.2)' }}
          />
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
          <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }}>routing trace</Typography>
        </Box>
      </Box>

      <Collapse in={open}>
        <Paper sx={{ mt: 1, p: 1.5, background: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 2 }}>
          {/* Execution flow */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, letterSpacing: 0.5 }}>
            EXECUTION FLOW
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
            {[
              { label: 'Input Guardrail', color: '#00BFA5' },
              { label: '→', arrow: true },
              { label: 'Router Agent', color: '#9D96FF' },
              { label: '→', arrow: true },
              { label: AGENT_LABELS[response.agentUsed] || response.agentUsed, color: agentColor },
            ].map((item, i) =>
              item.arrow ? (
                <Typography key={i} variant="caption" color="text.secondary">→</Typography>
              ) : (
                <Chip key={i} label={item.label} size="small" sx={{ fontSize: '0.65rem', background: `${item.color}1a`, color: item.color }} />
              )
            )}
          </Box>

          {/* Routing decision */}
          {response.routingDecision && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, letterSpacing: 0.5, mb: 0.5 }}>
                ROUTER DECISION
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <strong>Intent:</strong> {response.routingDecision.intent}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <strong>Reasoning:</strong> {response.routingDecision.reasoning}
              </Typography>
            </Box>
          )}

          {/* Tool calls */}
          {response.toolCallsLog?.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, letterSpacing: 0.5, mb: 0.5 }}>
                TOOLS CALLED
              </Typography>
              {response.toolCallsLog.map((tc, i) => (
                <Box key={i} sx={{ mb: 0.75, pl: 1, borderLeft: '2px solid rgba(108,99,255,0.3)' }}>
                  <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                    🔧 {tc.toolName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    Output: {JSON.stringify(tc.output).slice(0, 120)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Block reason */}
          {response.blocked && response.blockReason && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.5, borderRadius: 1, fontSize: '0.7rem' }}>
              {response.blockReason}
            </Alert>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}

export function ChatInterface({ documentId }: ChatInterfaceProps) {
  const [question, setQuestion] = useState('');
  const [localMessages, setLocalMessages] = useState<{ question: string; response: AskResponse }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [askQuestion, { isLoading }] = useAskQuestionMutation();
  const { data: statusData } = useGetDocumentStatusQuery(documentId, { pollingInterval: 2000 });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isLoading]);

  // Show waiting state if document not yet ready
  if (statusData?.status !== 'ready') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 2 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Document is still being analyzed. Chat will be available once analysis is complete...
        </Typography>
      </Box>
    );
  }

  const handleSend = async () => {
    const q = question.trim();
    if (!q || isLoading) return;
    setQuestion('');
    try {
      const response = await askQuestion({ documentId, question: q }).unwrap();
      setLocalMessages((prev) => [...prev, { question: q, response }]);
    } catch (err: any) {
      const errorResponse: AskResponse = {
        success: false,
        documentId,
        question: q,
        answer: err?.data?.message || 'An error occurred. Please try again.',
        agentUsed: 'error',
        routingDecision: { selectedAgent: 'error', reasoning: '', intent: '' },
        toolCallsLog: [],
        blocked: true,
        blockReason: err?.data?.message,
        chatId: '',
      };
      setLocalMessages((prev) => [...prev, { question: q, response: errorResponse }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
          Document Q&amp;A
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Every question routes through: Input Guardrail → Router Agent → Specialized Agent → Output Guardrail
        </Typography>
      </Box>

      {/* Suggestion chips */}
      {localMessages.length === 0 && (
        <Box sx={{ mb: 2 }}>
          <Paper sx={{ p: 2.5, mb: 2, borderRadius: 3, background: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.15)' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: 'primary.light' }}>
              💡 Is chat mein kya pooch sakte ho?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
              Is PDF ke baare mein kuch bhi poochh sakte ho — summary, koi specific topic, key points, conclusions, ya koi bhi detail jo document mein ho. Jitna detail mein poochho ge, utna better jawab milega.
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Example questions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              'Is document ka summary do',
              'Main themes kya hain?',
              'Key entities kaun si hain?',
              'Conclusion kya hai?',
              'Important points bullet points mein do',
              'Ye document kis baare mein hai?',
            ].map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                variant="outlined"
                onClick={() => setQuestion(s)}
                sx={{ fontSize: '0.72rem', cursor: 'pointer', borderColor: 'rgba(108,99,255,0.3)', color: 'primary.light', '&:hover': { background: 'rgba(108,99,255,0.12)', borderColor: 'primary.main' } }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          pr: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(108,99,255,0.3)', borderRadius: 2 },
        }}
      >
        {localMessages.map((msg, idx) => (
          <Box key={idx} sx={{ mb: 3 }}>
            {/* User bubble */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Box sx={{ maxWidth: '80%', p: 1.5, borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg, #6C63FF, #4B44CC)', display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <PersonIcon sx={{ fontSize: 16, mt: 0.3, flexShrink: 0 }} />
                <Typography variant="body2">{msg.question}</Typography>
              </Box>
            </Box>

            {/* Agent bubble */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: msg.response.blocked ? 'rgba(255,82,82,0.15)' : 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {msg.response.blocked
                  ? <BlockIcon sx={{ fontSize: 16, color: '#FF5252' }} />
                  : <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                }
              </Box>
              <Box sx={{ flex: 1 }}>
                <Paper sx={{
                  p: 2,
                  borderRadius: '4px 16px 16px 16px',
                  background: msg.response.blocked ? 'rgba(255,82,82,0.06)' : 'rgba(26,26,46,0.9)',
                  border: msg.response.blocked ? '1px solid rgba(255,82,82,0.2)' : '1px solid rgba(108,99,255,0.1)',
                }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: msg.response.blocked ? '#FF8A80' : 'text.primary' }}>
                    {msg.response.answer}
                  </Typography>
                </Paper>
                <RoutingTrace response={msg.response} />
              </Box>
            </Box>
          </Box>
        ))}

        {isLoading && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={16} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Running agent pipeline: Guardrail → Router → Agent → Tools...
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider sx={{ my: 2, borderColor: 'rgba(108,99,255,0.1)' }} />

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="PDF ke baare mein kuch bhi poochho... (Enter to send)"
          disabled={isLoading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              background: 'rgba(108,99,255,0.04)',
              '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
        <Tooltip title="Send (Enter)">
          <span>
            <IconButton
              onClick={handleSend}
              disabled={!question.trim() || isLoading}
              sx={{
                background: 'linear-gradient(135deg, #6C63FF, #4B44CC)',
                color: 'white',
                width: 44,
                height: 44,
                '&:hover': { background: 'linear-gradient(135deg, #9D96FF, #6C63FF)' },
                '&.Mui-disabled': { background: 'rgba(108,99,255,0.2)', color: 'rgba(255,255,255,0.3)' },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
