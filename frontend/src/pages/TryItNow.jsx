// src/pages/TryItNow.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
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
  Slide
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
  InsertDriveFile
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';
import api, { saveConversation, getConversations, deleteConversation } from '../services/api';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const typing = keyframes`
  0%, 60%, 100% { opacity: 1; }
  30% { opacity: 0.3; }
`;

// FileUploadModal Component
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

  const handleClose = () => {
    setSelectedFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth TransitionComponent={Fade}>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload color="primary" />
            {title}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mb: 1, color: 'primary.main' }}>
          Supported formats: {allowedTypes.join(', ').toUpperCase()}
        </Typography>
        
        <Box
          sx={{
            border: '2px dashed',
            borderColor: selectedFiles.length > 0 ? 'success.main' : 'primary.main',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            backgroundColor: selectedFiles.length > 0 ? 'success.light' : 'primary.light',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'action.hover',
              animation: `${pulse} 1s ease-in-out`
            }
          }}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept={allowedTypes.map(ext => `.${ext}`).join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1, opacity: 0.8 }} />
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
            {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 'Click to select files'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedFiles.length > 0 ? 'Click to add more files' : 'Drag & drop or click to browse multiple files'}
          </Typography>
        </Box>

        {selectedFiles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Selected Files ({selectedFiles.length}):
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {selectedFiles.map((file, index) => (
                <Slide in direction="up" key={index} timeout={index * 100}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      mb: 0.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      animation: `${fadeIn} 0.3s ease-in`
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InsertDriveFile color="primary" fontSize="small" />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={file.name}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFile(index)}
                      color="error"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                </Slide>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          disabled={selectedFiles.length === 0 || isUploading}
          startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
          sx={{
            background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #00ACC1 90%)',
            }
          }}
        >
          {isUploading ? `Uploading ${selectedFiles.length} files...` : `Upload ${selectedFiles.length} files`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 64px - 56px)',
  backgroundColor: theme.palette.background.default,
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  overflowY: 'auto',
  padding: theme.spacing(2),
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.paper,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

const MessageBubble = styled(Box)(({ theme, isUser, isError }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(2),
  borderRadius: isUser ? '18px 18px 0 18px' : '18px 18px 18px 0',
  backgroundColor: isError 
    ? theme.palette.error.light 
    : isUser 
      ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
      : theme.palette.grey[100],
  color: isError || isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  wordWrap: 'break-word',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  border: isUser ? 'none' : `1px solid ${theme.palette.divider}`,
  animation: `${fadeIn} 0.3s ease-in`,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
}));

const SourceChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
  fontSize: '0.7rem',
  height: '24px',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
}));

const TryItNow = () => {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef(null);

  const open = Boolean(anchorEl);

  const fetchConversations = useCallback(async () => {
    try {
      if (user && user.id) {
        const response = await getConversations(user.id);
        if (response.success) {
          setConversations(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enhanced error message extraction
  const extractErrorMessage = (error) => {
    console.log('🔍 Raw error object:', error);
    
    if (typeof error === 'string') return error;
    
    if (error.message) {
      try {
        const parsed = JSON.parse(error.message);
        return parsed.detail || parsed.message || error.message;
      } catch {
        return error.message;
      }
    }
    
    if (error.data?.detail) return error.data.detail;
    if (error.data?.message) return error.data.message;
    if (error.detail) return error.detail;
    
    return 'Unknown error occurred. Please check the console for details.';
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      text: input, 
      sender: 'user', 
      timestamp: new Date(),
      id: Date.now()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      console.log('🔄 Sending message to backend:', input);
      
      const response = await api.chat.sendMessage(input);
      
      console.log('✅ Backend response:', response);
      
      if (response.success && response.data) {
        const aiResponse = { 
          text: response.data.answer, 
          sender: 'ai', 
          timestamp: new Date(),
          id: Date.now() + 1,
          sources: response.data.sources || [],
          providerInfo: response.data.provider_info
        };
        
        const updatedMessages = [...newMessages, aiResponse];
        setMessages(updatedMessages);
        
        if (user && user.id) {
          await saveConversation(user.id, {
            messages: updatedMessages,
            timestamp: new Date()
          });
          await fetchConversations();
        }
      } else {
        throw new Error(response.message || 'Failed to get response from AI');
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
      
      const errorResponse = { 
        text: `Sorry, I encountered an error: ${errorMessage}. Please try again.`, 
        sender: 'ai', 
        timestamp: new Date(),
        id: Date.now() + 1,
        isError: true
      };
      
      setMessages([...newMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleFileUpload = async (files) => {
    if (!user || user.role !== 'admin') {
      setError('Only admins can upload files for training');
      return;
    }

    try {
      const uploadPromises = files.map(file => {
        const adminData = {
          id: user.id,
          username: user.name
        };
        return api.admin.uploadDocument(file, adminData);
      });

      const results = await Promise.allSettled(uploadPromises);
      
      const successfulUploads = results.filter(result => result.status === 'fulfilled' && result.value.success);
      const failedUploads = results.filter(result => result.status === 'rejected' || !result.value?.success);

      if (successfulUploads.length > 0) {
        const fileMessage = {
          text: `✅ Successfully uploaded ${successfulUploads.length} file(s). The AI can now answer questions about these documents.`,
          sender: 'system',
          timestamp: new Date(),
          id: Date.now()
        };
        
        setMessages(prev => [...prev, fileMessage]);
      }

      if (failedUploads.length > 0) {
        setError(`Failed to upload ${failedUploads.length} file(s). Please try again.`);
      }

    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = extractErrorMessage(error);
      setError(`File upload failed: ${errorMessage}`);
    }
    
    setUploadModalOpen(false);
  };

  const handleDownloadChat = (format) => {
    const content = messages.map(msg => 
      `${msg.sender.toUpperCase()}: ${msg.text}\nTimestamp: ${msg.timestamp.toLocaleString()}\n${msg.sources ? `Sources: ${msg.sources.map(s => s.title).join(', ')}` : ''}\n`
    ).join('\n---\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `legalai_chat_${new Date().toISOString().split('T')[0]}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      await fetchConversations();
      setMessages([]);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      const errorMessage = extractErrorMessage(error);
      setError(`Failed to delete conversation: ${errorMessage}`);
    }
  };

  const loadConversation = (conversation) => {
    setMessages(conversation.messages || []);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Test backend connection on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        console.log('🔌 Testing backend connection...');
        await api.health.getRoot();
        console.log('✅ Backend connection successful');
      } catch (error) {
        console.error('❌ Backend connection failed:', error);
        const errorMessage = extractErrorMessage(error);
        setError(`Backend connection issue: ${errorMessage}`);
      }
    };

    testBackendConnection();
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {user && (
        <Fade in timeout={800}>
          <Box sx={{ 
            width: 300, 
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1 }} />
                Chat History
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <List>
                {conversations.length > 0 ? (
                  conversations.map((conv, index) => (
                    <React.Fragment key={conv.id}>
                      <ListItem 
                        button 
                        onClick={() => loadConversation(conv)}
                        sx={{
                          '&:hover': { 
                            backgroundColor: 'action.hover',
                            transform: 'translateX(4px)',
                            transition: 'all 0.2s ease'
                          },
                          backgroundColor: messages.length > 0 && conv.messages && 
                                         JSON.stringify(conv.messages) === JSON.stringify(messages) 
                           ? 'action.selected' : 'transparent',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <ListItemText
                          primary={conv.messages?.[0]?.text?.substring(0, 50) + (conv.messages?.[0]?.text?.length > 50 ? '...' : '') || 'New Chat'}
                          secondary={new Date(conv.timestamp).toLocaleString()}
                          primaryTypographyProps={{ noWrap: true, fontSize: '0.9rem', fontWeight: 500 }}
                          secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                        />
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: 'error.light',
                              color: 'error.main'
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItem>
                      {index < conversations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <Psychology sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
                    <Typography variant="body2">
                      No conversations yet
                    </Typography>
                  </Box>
                )}
              </List>
            </Box>

            {conversations.length > 0 && (
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  color="primary"
                  onClick={clearChat}
                  disabled={messages.length === 0}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Clear Current Chat
                </Button>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 20px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology sx={{ fontSize: 32 }} />
            LegalAI Assistant
          </Typography>
          
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {user.role === 'admin' && (
                <Tooltip title="Upload training documents">
                  <IconButton 
                    color="primary"
                    onClick={() => setUploadModalOpen(true)}
                    sx={{
                      '&:hover': {
                        animation: `${pulse} 1s ease-in-out`,
                        backgroundColor: 'primary.light'
                      }
                    }}
                  >
                    <CloudUpload />
                  </IconButton>
                </Tooltip>
              )}
              
              <Chip 
                avatar={<Avatar sx={{ bgcolor: 'primary.dark' }}>{user.name?.charAt(0)?.toUpperCase()}</Avatar>}
                label={user.name}
                variant="outlined"
                onClick={handleMenuOpen}
                sx={{ 
                  cursor: 'pointer',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white'
                  }
                }}
                color={user.role === 'admin' ? 'primary' : 'default'}
              />
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                TransitionComponent={Fade}
              >
                <MenuItem onClick={handleMenuClose}>
                  <AccountCircle sx={{ mr: 1 }} /> Profile
                </MenuItem>
                {user.role === 'admin' && (
                  <MenuItem onClick={() => window.location.href = '/admin/dashboard'}>
                    <History sx={{ mr: 1 }} /> Admin Dashboard
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 1 }} /> Logout
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button 
              variant="contained" 
              color="primary"
              href="/login"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0 30%, #00ACC1 90%)',
                }
              }}
            >
              Login
            </Button>
          )}
        </Box>

        {error && (
          <Slide in direction="down">
            <Alert 
              severity="error" 
              sx={{ mx: 2, mt: 1, borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </Slide>
        )}

        <ChatContainer>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              textAlign: 'center',
              color: 'text.secondary',
              animation: `${fadeIn} 0.5s ease-in`
            }}>
              <Psychology sx={{ fontSize: 80, opacity: 0.7, mb: 2 }} />
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                Welcome to LegalAI Assistant
              </Typography>
              <Typography variant="h6" sx={{ maxWidth: 600, mb: 3, opacity: 0.8 }}>
                {user ? 
                  'Start chatting with our AI legal assistant. Your conversations will be automatically saved.' : 
                  'Chat with our AI legal assistant. Sign in to save your conversation history.'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 4 }}>
                Ask questions about legal documents, get case summaries, analyze contracts, 
                or request legal information with our advanced AI assistant.
              </Typography>

              {error && (
                <Alert severity="warning" sx={{ mt: 2, maxWidth: 500, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>Connection Issue:</strong> {error}
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            messages.map((message, index) => (
              <MessageBubble 
                key={message.id || index} 
                isUser={message.sender === 'user'}
                isError={message.isError}
              >
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  {message.text}
                  {message.isStreaming && (
                    <Box component="span" sx={{ animation: `${typing} 1s infinite`, ml: 0.5 }}>
                      ▊
                    </Box>
                  )}
                </Typography>
                
                {/* Show sources for AI messages */}
                {message.sender === 'ai' && message.sources && message.sources.length > 0 && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid rgba(0,0,0,0.1)` }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <Source sx={{ fontSize: 16, mr: 0.5 }} /> Sources:
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {message.sources.slice(0, 3).map((source, idx) => (
                        <Tooltip key={idx} title={source.content_preview || source.source}>
                          <SourceChip
                            label={source.title || source.source}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      ))}
                      {message.sources.length > 3 && (
                        <SourceChip
                          label={`+${message.sources.length - 3} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Show provider info for AI messages */}
                {message.sender === 'ai' && message.providerInfo && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                      Powered by: {message.providerInfo.embeddings?.type || 'Unknown'} + {message.providerInfo.llm?.type || 'Unknown'}
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" display="block" sx={{ 
                  textAlign: 'right',
                  opacity: 0.7,
                  mt: 0.5
                }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </MessageBubble>
            ))
          )}
          
          {(isLoading || isStreaming) && (
            <MessageBubble isUser={false}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography variant="body1">
                  {isStreaming ? 'LegalAI is responding...' : 'LegalAI is thinking...'}
                </Typography>
              </Box>
            </MessageBubble>
          )}
          <div ref={chatEndRef} />
        </ChatContainer>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: 0
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            {/* File Upload Button - Now on the LEFT side */}
            <Tooltip title="Attach files">
              <IconButton
                color="primary"
                onClick={() => setUploadModalOpen(true)}
                disabled={isLoading || isStreaming}
                sx={{
                  background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
                    animation: `${pulse} 1s ease-in-out`
                  },
                  '&.Mui-disabled': {
                    background: 'grey.300',
                  }
                }}
              >
                <AttachFile />
              </IconButton>
            </Tooltip>

            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask LegalAI anything about legal documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              disabled={isLoading || isStreaming}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
                  },
                }
              }}
            />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Tooltip title="Send message">
                <span>
                  <IconButton 
                    color="primary" 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading || isStreaming}
                    size="large"
                    sx={{
                      background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1565c0 30%, #00ACC1 90%)',
                        animation: `${pulse} 1s ease-in-out`
                      },
                      '&.Mui-disabled': {
                        background: 'grey.300',
                      }
                    }}
                  >
                    <Send />
                  </IconButton>
                </span>
              </Tooltip>
              
              {user && messages.length > 0 && (
                <Tooltip title="Download chat history">
                  <IconButton
                    color="secondary"
                    onClick={() => handleDownloadChat('txt')}
                    size="small"
                    sx={{
                      '&:hover': {
                        animation: `${pulse} 1s ease-in-out`
                      }
                    }}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* File Upload Modal - Available for all users */}
      <FileUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleFileUpload}
        allowedTypes={['pdf', 'docx', 'doc', 'txt', 'pptx', 'xlsx', 'csv', 'json']}
        title={user?.role === 'admin' ? "Upload Legal Documents for Training" : "Upload Files"}
        description={user?.role === 'admin' 
          ? "Upload multiple legal documents to train the AI. All files will be processed automatically."
          : "Upload files to analyze with LegalAI. Supported document types will be processed for chat context."
        }
      />
    </Box>
  );
};

export default TryItNow;