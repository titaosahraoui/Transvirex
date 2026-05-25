import mongoose, { Schema, Document } from 'mongoose';

// ── Message (dispatcher ↔ driver chat) ───────────────────────────────────────
export interface IMessage extends Document {
  conversationId: string; // `${Math.min(senderId,receiverId)}_${Math.max(...)}` for stable ID
  senderId:   string;
  receiverId: string;
  missionId?: string;
  content:    string;
  read:       boolean;
  timestamp:  Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: String, required: true, index: true },
  senderId:       { type: String, required: true },
  receiverId:     { type: String, required: true },
  missionId:      { type: String },
  content:        { type: String, required: true },
  read:           { type: Boolean, default: false },
  timestamp:      { type: Date, default: Date.now },
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

// ── Notification ──────────────────────────────────────────────────────────────
export interface INotification extends Document {
  userId:    string;
  message:   string;
  type:      string; // 'mission:assigned' | 'mission:status' | 'alert:delay'
  read:      boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId:    { type: String, required: true, index: true },
  message:   { type: String, required: true },
  type:      { type: String, required: true },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// ── Connection ────────────────────────────────────────────────────────────────
export async function connectMongo(): Promise<void> {
  const uri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/transvirex_notifications';
  await mongoose.connect(uri);
  console.log('[notification] MongoDB connected');
}
