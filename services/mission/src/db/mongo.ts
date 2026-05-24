import mongoose, { Schema, Document } from 'mongoose';

// ── DeliveryEvent document ────────────────────────────────────────────────────
export interface IDeliveryEvent extends Document {
  mission_id: string;
  driver_id: string;
  status: string;
  location: { lat: number; lng: number };
  notes?: string;
  timestamp: Date;
}

const DeliveryEventSchema = new Schema<IDeliveryEvent>({
  mission_id: { type: String, required: true, index: true },
  driver_id:  { type: String, required: true },
  status:     { type: String, required: true },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  notes:     { type: String },
  timestamp: { type: Date, default: Date.now },
});

export const DeliveryEvent = mongoose.model<IDeliveryEvent>(
  'DeliveryEvent',
  DeliveryEventSchema
);

// ── Connection ────────────────────────────────────────────────────────────────
export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/transvirex_mission';
  await mongoose.connect(uri);
  console.log('[mission] MongoDB connected');
}
