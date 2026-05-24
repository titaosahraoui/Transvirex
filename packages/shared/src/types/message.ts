export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  missionId?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface SendMessagePayload {
  to: string;
  content: string;
  missionId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'mission_assigned' | 'mission_status' | 'alert_delay' | 'message';
  read: boolean;
  createdAt: string;
}
