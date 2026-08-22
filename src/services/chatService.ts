import apiClient from '../apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatMessage[], language: string): Promise<string> => {
  const response = await apiClient.post('/storefront/chat', { messages, language });
  return response.data.reply;
};
