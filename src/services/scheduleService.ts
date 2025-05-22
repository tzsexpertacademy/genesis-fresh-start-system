import { apiRequest } from './whatsappService';
import { ScheduledMessage } from '../types/whatsapp';

interface ScheduleMessagePayload {
  number: string;
  message: string;
  scheduleTime: string; // ISO string format
}

interface ScheduleMessageResponse {
  status: boolean;
  message: string;
  data?: {
    scheduledMessage: ScheduledMessage;
  };
}

interface GetScheduledMessagesResponse {
  status: boolean;
  message: string;
  data?: {
    messages: ScheduledMessage[];
  };
}

interface DeleteScheduledMessageResponse {
  status: boolean;
  message: string;
}

// Get all scheduled messages
export const getScheduledMessages = async (): Promise<GetScheduledMessagesResponse> => {
  return apiRequest('/scheduled-messages');
};

// Schedule a new message
export const scheduleMessage = async (payload: ScheduleMessagePayload): Promise<ScheduleMessageResponse> => {
  return apiRequest('/scheduled-messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Delete a scheduled message
export const deleteScheduledMessage = async (id: string): Promise<DeleteScheduledMessageResponse> => {
  return apiRequest(`/scheduled-messages/${id}`, {
    method: 'DELETE',
  });
};