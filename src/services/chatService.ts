import apiClient from '../apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatMessage[]): Promise<string> => {
  const response = await apiClient.post('/storefront/chat', { messages });
  return response.data.reply;
};
