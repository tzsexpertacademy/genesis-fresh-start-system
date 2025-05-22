// WhatsApp types for TypeScript

// Message in inbox
export interface InboxMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  read: boolean;
  outgoing?: boolean;
  recipient?: string;
}

// Contact with messages (for inbox)
export interface Contact {
  phoneNumber: string;
  displayName: string;
  lastMessage: InboxMessage;
  unreadCount: number;
  messages: InboxMessage[];
}

// Messages grouped by date
export interface MessageGroup {
  date: string;
  messages: InboxMessage[];
}

// WhatsApp Contact (stored in database)
export interface WhatsAppContact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  categories?: WhatsAppContactCategory[];
  created_at: string;
  updated_at: string;
}

// WhatsApp Contact Category
export interface WhatsAppContactCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

// WhatsApp connection status
export type WhatsAppConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'unknown';

// Backend connection status
export type BackendConnectionStatus = 'online' | 'offline' | 'unknown';

// View mode for inbox
export type InboxViewMode = 'contacts' | 'chat';

// Item (Product/Service) type
export interface Item {
  id: string;
  name: string;
  description?: string;
  type: 'product' | 'service' | 'other'; // Example types
  price?: number;
  created_at: string;
  updated_at: string;
}

// Scheduled Message type
export interface ScheduledMessage {
  id: string;
  number: string;
  message: string;
  scheduleTime: string; // ISO string format
  status: 'scheduled' | 'sent' | 'failed';
  error?: string;
  created_at: string;
  updated_at: string;
}