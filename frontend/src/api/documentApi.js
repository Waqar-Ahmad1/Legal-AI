import api from './authApi';

// Define all document API methods in an object
const documentApi = {
  uploadDocument: (formData) => api.post('/documents/upload', formData),
  getDocuments: () => api.get('/documents'),
  summarizeDocument: (docId) => api.post(`/documents/${docId}/summarize`),
  askQuestion: (docId, question) => api.post(`/documents/${docId}/ask`, { question }),
};

export default documentApi;
