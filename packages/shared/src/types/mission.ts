export type MissionStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'failed';

export interface Mission {
  id: string;
  clientName: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deadline: string;
  status: MissionStatus;
  driverId?: string;
  driverName?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateMissionRequest {
  clientName: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deadline: string;
}

export interface UpdateMissionStatusRequest {
  status: MissionStatus;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface AssignMissionRequest {
  driverId: string;
}
