// src/pages/TryItNow.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useTheme, styled, alpha, keyframes } from '@mui/material/styles';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Button,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Zoom,
  Slide,
  Skeleton,
  Grid,
  GlobalStyles,
  CssBaseline
} from '@mui/material';
import {
  Send,
  AttachFile,
  Download,
  Delete,
  AccountCircle,
  History,
  Logout,
  Source,
  Close,
  CloudUpload,
  Psychology,
  InsertDriveFile,
  Terminal,
  ChatBubbleOutline,
  AutoAwesome,
  MoreVert,
  Add,
  ChevronLeft,
  ChevronRight,
  InfoOutlined,
  CheckCircleOutline,
  ErrorOutline,
  Scale
} from '@mui/icons-material';

import { chatAPI, adminAPI, saveConversation, getConversations, deleteConversation } from '../services/api';

/* ─── Styles & Animations ────────────────────────────────────────────────────── */

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  background: theme.palette.background.default,
  color: theme.palette.text.primary,
}));

const Sidebar = styled(Box, { shouldForwardProp: (prop) => prop !== 'isOpen' })(({ theme, isOpen }) => ({
  width: '320px',
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  position: 'relative',
  zIndex: 10,
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  marginLeft: isOpen ? 0 : -320,
}));

const SidebarToggle = styled(IconButton)(({ theme, isOpen }) => ({
  position: 'absolute',
  left: isOpen ? 320 : 0,
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1000,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: '#3b82f6',
  color: 'white',
  width: 28,
  height: 56,
  borderRadius: '0 8px 8px 0',
  '&:hover': {
    backgroundColor: '#2563eb',
    width: 32,
  },
  boxShadow: '4px 0 12px rgba(0,0,0,0.3)',
}));

const MainSection = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  overflow: 'hidden',
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  zIndex: 5,
}));

const ChatArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: theme.spacing(4, 2),
  scrollBehavior: 'smooth',
  /* Hide scrollbar for Chrome, Safari and Opera */
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  /* Hide scrollbar for IE, Edge and Firefox */
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
}));

const InputSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 4, 2),
  backgroundColor: 'transparent',
}));

const InputContainer = styled(Box)(({ theme }) => ({
  maxWidth: 1000,
  margin: '0 auto',
  position: 'relative',
  backgroundColor: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(20px)',
  borderRadius: 24,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}, 0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
}));

const MessageBubble = styled(motion.div)(({ theme, isUser, isError }) => ({
  maxWidth: '85%',
  padding: theme.spacing(2, 3),
  marginBottom: theme.spacing(3),
  borderRadius: 24,
  backgroundColor: isError
    ? alpha(theme.palette.error.dark, 0.4)
    : isUser
      ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
      : alpha(theme.palette.background.paper, 0.7),
  color: theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  border: `1px solid ${isUser ? 'transparent' : alpha(theme.palette.divider, 0.1)}`,
  position: 'relative',
  fontSize: '0.95rem',
  lineHeight: 1.6,
}));

const SourceTag = styled(Chip)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.light,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  height: 24,
  fontSize: '0.75rem',
  fontWeight: 500,
  margin: theme.spacing(0.5, 0.5, 0, 0),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  },
}));

/* ─── Components ────────────────────────────────────────────────────────────── */

const FileUploadModal = ({ open, onClose, onUpload, allowedTypes = ['pdf', 'docx', 'doc', 'txt', 'pptx', 'xlsx', 'csv', 'json'], title = "Upload Document", description = "Select files to upload" }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      return allowedTypes.includes(fileExtension);
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    } else {
      alert(`Invalid file type. Allowed types: ${allowedTypes.join(', ').toUpperCase()}`);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length > 0 && onUpload) {
      setIsUploading(true);
      try {
        await onUpload(selectedFiles);
        setSelectedFiles([]);
        onClose();
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0f172a',
          color: '#f8fafc',
          borderRadius: 3,
          backgroundImage: 'none',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <CloudUpload fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
          {description}
        </Typography>

        <Box
          sx={{
            border: '2px dashed',
            borderColor: selectedFiles.length > 0 ? '#10b981' : alpha('#3b82f6', 0.5),
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            backgroundColor: alpha('#3b82f6', 0.03),
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: '#3b82f6',
              backgroundColor: alpha('#3b82f6', 0.05),
            }
          }}
          onClick={() => document.getElementById('file-input-chat').click()}
        >
          <input
            id="file-input-chat"
            type="file"
            multiple
            accept={allowedTypes.map(ext => `.${ext}`).join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <CloudUpload sx={{ fontSize: 48, color: alpha('#3b82f6', 0.7), mb: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 'Drag & drop legal docs'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Supported: {allowedTypes.join(', ').toUpperCase()}
          </Typography>
        </Box>

        {selectedFiles.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>
              Files to upload
            </Typography>
            <Box sx={{ maxHeight: 180, overflowY: 'auto', pr: 1 }}>
              {selectedFiles.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    mb: 1,
                    bgcolor: alpha('#1e293b', 0.5),
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.05)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <InsertDriveFile sx={{ color: '#3b82f6', fontSize: 20 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#f8fafc' }} noWrap>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => handleRemoveFile(index)} sx={{ color: '#ef4444' }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }}>Cancel</Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={selectedFiles.length === 0 || isUploading}
          sx={{
            borderRadius: 2,
            px: 4,
            bgcolor: '#3b82f6',
            '&:hover': { bgcolor: '#2563eb' }
          }}
          startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isUploading ? 'Uploading...' : 'Confirm Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TryItNow = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const chatEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      if (user?.id) {
        const response = await getConversations(user.id);
        if (response.success) setConversations(response.data);
      }
    } catch (e) {
      console.error('Error fetching conversations:', e);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractErrorMessage = (err) => {
    if (typeof err === 'string') return err;
    if (err.message) {
      try {
        const parsed = JSON.parse(err.message);
        return parsed.detail || parsed.message || err.message;
      } catch {
        return err.message;
      }
    }
    return err.data?.detail || err.data?.message || err.detail || 'Connection failed';
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date(),
      id: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(input);
      if (response.success && response.data) {
        const aiResponse = {
          text: response.data.answer,
          sender: 'ai',
          timestamp: new Date(),
          id: Date.now() + 1,
          sources: response.data.sources || [],
          providerInfo: response.data.provider_info
        };

        setMessages(prev => {
          const updated = [...prev, aiResponse];
          if (user?.id) {
            saveConversation(user.id, { messages: updated, timestamp: new Date() })
              .then(fetchConversations);
          }
          return updated;
        });
      } else {
        throw new Error(response.message || 'AI failed to respond');
      }
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      setMessages(prev => [...prev, {
        text: `Error: ${msg}`,
        sender: 'ai',
        timestamp: new Date(),
        id: Date.now() + 1,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!user || user.role !== 'admin') {
      setError('Admin privileges required for training uploads');
      return;
    }
    try {
      const uploadPromises = files.map(file => adminAPI.uploadDocument(file, { id: user.id, username: user.name }));
      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      if (successful > 0) {
        setMessages(prev => [...prev, {
          text: `✅ Successfully analyzed ${successful} document(s). I'm ready to answer context-aware questions.`,
          sender: 'system',
          timestamp: new Date(),
          id: Date.now()
        }]);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
    setUploadModalOpen(false);
  };

  const handleDownloadChat = (format) => {
    const content = messages.map(msg =>
      `${msg.sender.toUpperCase()}: ${msg.text}\nTimestamp: ${msg.timestamp.toLocaleString()}\n`
    ).join('\n---\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `legalai_export_${new Date().toISOString().split('T')[0]}.${format}`;
    link.click();
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      await fetchConversations();
      if (messages.length > 0) setMessages([]);
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={{
          'html, body, #root': {
            margin: 0,
            padding: 0,
            height: '100vh',
            width: '100vw',
            overflow: 'hidden !important',
          },
          '::-webkit-scrollbar': {
            display: 'none !important',
          },
          '*': {
            msOverflowStyle: 'none !important',
            scrollbarWidth: 'none !important',
          },
        }}
      />
      <MainContainer sx={{ bgcolor: '#0f172a' }}>
        {/* ─── SIDEBAR ─── */}
        <Sidebar isOpen={isSidebarOpen}>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
              <Terminal htmlColor="#fff" fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', letterSpacing: -0.5 }}>History</Typography>
          </Box>

          <Box sx={{ px: 2, mb: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={() => setMessages([])}
              sx={{ borderRadius: 2, bgcolor: alpha('#3b82f6', 0.1), color: '#60a5fa', border: `1px solid ${alpha('#3b82f6', 0.2)}`, boxShadow: 'none', '&:hover': { bgcolor: alpha('#3b82f6', 0.2), borderColor: '#3b82f6' } }}
            >
              New Case
            </Button>
          </Box>

          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            px: 1,
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}>
            <List sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <ListItem
                    key={conv.id}
                    button
                    onClick={() => setMessages(conv.messages || [])}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: alpha('#94a3b8', 0.1) },
                      bgcolor: messages.length > 0 && conv.messages && JSON.stringify(conv.messages) === JSON.stringify(messages) ? alpha('#3b82f6', 0.1) : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: '#94a3b8' }}>
                      <ChatBubbleOutline fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={conv.messages?.[0]?.text || 'Untitled Session'}
                      secondary={new Date(conv.timestamp).toLocaleDateString()}
                      primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', color: '#f8fafc', fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', color: '#94a3b8' }}
                    />
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }} sx={{ opacity: 0.2, '&:hover': { opacity: 1, color: '#ef4444' } }}>
                      <Delete fontSize="inherit" />
                    </IconButton>
                  </ListItem>
                ))
              ) : (
                <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                  <History sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="caption">No previous sessions</Typography>
                </Box>
              )}
            </List>
          </Box>
        </Sidebar>

        <SidebarToggle isOpen={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </SidebarToggle>

        {/* ─── CHAT AREA ─── */}
        <MainSection>
          <ChatHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                <Scale fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.2 }}>LegalAI Pro</Typography>
                <Typography variant="caption" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} /> Semantic Engine Online
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {user && (
                <>
                  <Tooltip title="Export Transcript">
                    <IconButton onClick={() => handleDownloadChat('txt')} sx={{ color: '#94a3b8' }}>
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Account Settings">
                    <IconButton
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      sx={{ p: 0.5, border: '1px solid rgba(148,163,184,0.1)' }}
                    >
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#3b82f6', fontSize: '0.8rem', fontWeight: 700 }}>
                        {user.name?.charAt(0).toUpperCase()}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} TransitionComponent={Fade}>
                    <MenuItem onClick={logout} sx={{ gap: 1.5, color: '#ef4444' }}><Logout fontSize="small" /> Sign Out</MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </ChatHeader>

          <ChatArea>
            {messages.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 3 }}>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                  <Box sx={{ mb: 4, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: -10, right: -10, animation: `${float} 3s infinite ease-in-out` }}>
                      <AutoAwesome sx={{ color: '#f59e0b', fontSize: 32 }} />
                    </Box>
                    <Box sx={{ width: 100, height: 100, borderRadius: '30px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Psychology sx={{ fontSize: 60, color: '#3b82f6' }} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', mb: 1 }}>Intelligent Legal Counsel</Typography>
                  <Typography variant="body1" sx={{ color: '#94a3b8', maxWidth: 450, mb: 4 }}>
                    Analyze documents, query complex statutes, and receive cited legal insights powered by high-precision RAG.
                  </Typography>

                  <Grid container spacing={2} sx={{ maxWidth: 600, width: '100%', m: 0 }}>
                    {[
                      { icon: <Source />, label: 'Contract Analysis', desc: 'Identify risks and hidden clauses' },
                      { icon: <Scale />, label: 'Case Lookup', desc: 'Summary of relevant precedents' },
                      { icon: <Terminal />, label: 'Compliance', desc: 'Regulatory and statutory checks' },
                    ].map((item, i) => (
                      <Grid item xs={12} sm={4} key={i}>
                        <Box sx={{ p: 2, bgcolor: alpha('#1e293b', 0.5), borderRadius: 3, border: '1px solid rgba(148,163,184,0.05)', height: '100%' }}>
                          <Box sx={{ color: '#3b82f6', mb: 1 }}>{item.icon}</Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{item.label}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>{item.desc}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </motion.div>
              </Box>
            ) : (
              <AnimatePresence>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    isUser={msg.sender === 'user'}
                    isError={msg.isError}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                    {msg.sources?.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${alpha('#fff', 0.1)}`, pt: 1 }}>
                        {msg.sources.map((s, i) => (
                          <Tooltip key={i} title={s.content_preview || s.source}>
                            <SourceTag label={s.title || s.source} size="small" />
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.5, fontSize: '0.65rem' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </MessageBubble>
                ))}
              </AnimatePresence>
            )}
            {isLoading && (
              <MessageBubble isUser={false}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={16} sx={{ color: '#3b82f6' }} />
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Reasoning through documents...</Typography>
                </Box>
              </MessageBubble>
            )}
            <div ref={chatEndRef} />
          </ChatArea>

          <InputSection>
            <InputContainer>
              <TextField
                fullWidth
                multiline
                maxRows={6}
                placeholder="Query legal base..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    p: 2.5,
                    '& fieldset': { border: 'none' },
                    color: 'white',
                    fontSize: '1rem',
                  }
                }}
              />
              <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha('#0f172a', 0.3), borderRadius: '0 0 24px 24px' }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => setUploadModalOpen(true)} sx={{ color: '#94a3b8', '&:hover': { color: '#3b82f6', bgcolor: alpha('#3b82f6', 0.1) } }}>
                    <AttachFile fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={{ color: '#94a3b8' }}>
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: { xs: 'none', sm: 'block' } }}>
                    Press Enter to send
                  </Typography>
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    sx={{
                      bgcolor: '#3b82f6', color: 'white',
                      '&:hover': { bgcolor: '#2563eb' },
                      '&.Mui-disabled': { bgcolor: alpha('#1e293b', 0.8), color: '#64748b' },
                      width: 40, height: 40
                    }}
                  >
                    <Send fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </InputContainer>
          </InputSection>
        </MainSection>

        <FileUploadModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUpload={handleFileUpload}
          title={user?.role === 'admin' ? "Train Analytical Engine" : "Document Context"}
          description={user?.role === 'admin'
            ? "Add professional legal resources to the vector index. These files will influence all user queries."
            : "Securely upload temporary context files for this session."
          }
        />
      </MainContainer>
    </>
  );
};

export default TryItNow;