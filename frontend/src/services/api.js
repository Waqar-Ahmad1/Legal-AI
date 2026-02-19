// src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Generic API request function with proper headers
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  const config = {
    method: options.method || 'GET',
    headers: {
      ...options.headers,
    },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle request body
  if (options.body) {
    if (options.body instanceof FormData) {
      // For FormData, let the browser set the Content-Type
      config.body = options.body;
    } else {
      // For JSON, set Content-Type and stringify
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }
  }

  console.log(`🔄 Making ${config.method} request to: ${endpoint}`);
  console.log('📦 Request config:', {
    method: config.method,
    headers: config.headers,
    body: config.body instanceof FormData ? 'FormData' : config.body
  });

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    console.log(`📨 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ API error response data:', errorData);
      } catch (parseError) {
        errorData = {
          detail: `HTTP ${response.status} ${response.statusText}`,
          status: response.status
        };
        console.error('❌ API error (non-JSON response):', errorData);
      }

      // Create a more detailed error message
      const errorMessage = errorData.detail ||
        errorData.message ||
        errorData.error ||
        `Request failed with status ${response.status}`;

      const enhancedError = new Error(errorMessage);
      enhancedError.status = response.status;
      enhancedError.data = errorData;

      throw enhancedError;
    }

    const data = await response.json();
    console.log('✅ API success response:', data);
    return data;

  } catch (error) {
    console.error('❌ API request failed:', {
      message: error.message,
      status: error.status,
      data: error.data,
      endpoint,
      method: config.method
    });

    // Re-throw with enhanced information
    const enhancedError = new Error(error.message || 'Network request failed');
    enhancedError.status = error.status;
    enhancedError.data = error.data;
    enhancedError.originalError = error;

    throw enhancedError;
  }
};

// ========================
// Chat API Functions - UPDATED
// ========================

export const chatAPI = {
  // Send chat message - FIXED: Support multiple parameter formats
  sendMessage: async (message) => {
    return await apiRequest('/chat', {
      method: 'POST',
      body: { query: message },  // Using 'query' parameter as expected by backend
    });
  },

  // Alternative method that accepts different payload formats
  sendChat: async (payload) => {
    // Handle both string messages and object payloads
    const requestBody = typeof payload === 'string'
      ? { query: payload }
      : payload.query ? payload : { query: payload.message || payload.text };

    return await apiRequest('/chat', {
      method: 'POST',
      body: requestBody,
    });
  },

  // Stream chat message (for real-time responses)
  streamMessage: async (message, onChunk) => {
    try {
      const response = await chatAPI.sendMessage(message);

      if (response.success && response.data && onChunk) {
        // Simulate streaming by breaking response into chunks
        const answer = response.data.answer;
        const words = answer.split(' ');
        let currentText = '';

        for (let i = 0; i < words.length; i++) {
          currentText += words[i] + ' ';
          onChunk(currentText.trim());
          // Add delay to simulate real streaming
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }

      return response;
    } catch (error) {
      console.error('Stream chat error:', error);
      throw error;
    }
  },

  // Get chat history (if implemented in backend)
  getChatHistory: async (userId) => {
    return await apiRequest(`/api/chat/history/${userId}`);
  },

  // Test chat endpoint connectivity
  testConnection: async () => {
    try {
      const response = await chatAPI.sendMessage('Hello');
      return {
        success: true,
        message: 'Chat endpoint is working',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: `Chat endpoint error: ${error.message}`,
        error: error
      };
    }
  }
};

// ========================
// Auth API Functions
// ========================

export const authAPI = {
  // User registration
  register: async (userData) => {
    return await apiRequest('/register', {
      method: 'POST',
      body: userData,
    });
  },

  // User login
  login: async (credentials) => {
    return await apiRequest('/login', {
      method: 'POST',
      body: credentials,
    });
  },

  // Admin registration
  adminRegister: async (adminData) => {
    return await apiRequest('/admin/signup', {
      method: 'POST',
      body: adminData,
    });
  },

  // Admin login
  adminLogin: async (credentials) => {
    return await apiRequest('/admin/signin', {
      method: 'POST',
      body: credentials,
    });
  },

  // Validate token
  validateToken: async () => {
    return await apiRequest('/auth/validate');
  }
};

// ========================
// Admin API Functions
// ========================

export const adminAPI = {
  // Dashboard stats
  getDashboardStats: async () => {
    return await apiRequest('/admin/stats');
  },

  // Training history
  getTrainingHistory: async (page = 1, limit = 50) => {
    return await apiRequest(`/admin/training-history?page=${page}&limit=${limit}`);
  },

  // System status
  getSystemStatus: async () => {
    return await apiRequest('/admin/system-status');
  },

  // Upload document
  uploadDocument: async (file, adminData) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('adminId', adminData.id || 'admin_001');
    formData.append('adminName', adminData.username || 'Admin');

    return await apiRequest('/admin/train', {
      method: 'POST',
      body: formData,
    });
  },

  // Users list
  getUsersList: async (page = 1, limit = 10) => {
    return await apiRequest(`/admin/users?page=${page}&limit=${limit}`);
  },

  // System status
  getSystemStatus: async () => {
    return await apiRequest('/system/status');
  },

  // Delete training document
  deleteTrainingDocument: async (documentId) => {
    return await apiRequest(`/admin/training/document/${documentId}`, {
      method: 'DELETE',
    });
  }
};

// ========================
// Conversation API Functions
// ========================

export const saveConversation = async (userId, conversation) => {
  try {
    console.log('Saving conversation for user:', userId);

    // For now, store in localStorage since backend doesn't have conversation endpoints
    const key = `conversations_${userId}`;
    const conversations = JSON.parse(localStorage.getItem(key) || '[]');
    const newConversation = {
      ...conversation,
      id: Date.now().toString(),
      userId: userId,
      savedAt: new Date().toISOString()
    };

    conversations.push(newConversation);
    localStorage.setItem(key, JSON.stringify(conversations));

    return {
      success: true,
      data: newConversation
    };
  } catch (error) {
    console.error('Failed to save conversation:', error);
    throw error;
  }
};

export const getConversations = async (userId) => {
  try {
    console.log('Fetching conversations for user:', userId);

    // Get from localStorage
    const key = `conversations_${userId}`;
    const conversations = JSON.parse(localStorage.getItem(key) || '[]');

    return {
      success: true,
      data: conversations
    };
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    throw error;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    console.log('Deleting conversation:', conversationId);

    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.id) {
      const key = `conversations_${userData.id}`;
      const conversations = JSON.parse(localStorage.getItem(key) || '[]');
      const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
      localStorage.setItem(key, JSON.stringify(filteredConversations));
    }

    return {
      success: true,
      message: 'Conversation deleted successfully',
      deletedId: conversationId
    };
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
};

// ========================
// File Upload Functions
// ========================

export const uploadFile = async (file, adminData) => {
  return await adminAPI.uploadDocument(file, adminData);
};

// ========================
// Health Check Functions
// ========================

export const healthAPI = {
  // System health check
  checkHealth: async () => {
    return await apiRequest('/health');
  },

  // Root endpoint
  getRoot: async () => {
    return await apiRequest('/');
  },

  // Test all endpoints
  testAllEndpoints: async () => {
    const results = {};

    try {
      results.root = await healthAPI.getRoot();
    } catch (error) {
      results.root = { success: false, error: error.message };
    }

    try {
      results.health = await healthAPI.checkHealth();
    } catch (error) {
      results.health = { success: false, error: error.message };
    }

    try {
      results.chat = await chatAPI.testConnection();
    } catch (error) {
      results.chat = { success: false, error: error.message };
    }

    return results;
  }
};

// ========================
// Debug Utilities
// ========================

export const debugAPI = {
  // Test chat endpoint with different payload formats
  testChatFormats: async () => {
    const tests = [
      { name: 'Simple string', payload: 'Hello' },
      { name: 'Query object', payload: { query: 'Test message' } },
      { name: 'Message object', payload: { message: 'Test message' } },
      { name: 'Text object', payload: { text: 'Test message' } }
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`🧪 Testing: ${test.name}`);
        const response = await chatAPI.sendChat(test.payload);
        results.push({
          test: test.name,
          success: true,
          response: response
        });
      } catch (error) {
        results.push({
          test: test.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  },

  // Check backend connectivity
  checkBackendConnectivity: async () => {
    try {
      const response = await fetch(API_BASE_URL);
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        message: 'Backend is reachable'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Backend is not reachable'
      };
    }
  }
};

// ========================
// Default Export with all APIs
// ========================

export default {
  chat: chatAPI,
  auth: authAPI,
  admin: adminAPI,
  health: healthAPI,
  debug: debugAPI,
  saveConversation,
  getConversations,
  deleteConversation,
  uploadFile
};