export type DriverStatus = 'available' | 'on_mission' | 'offline';

export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  vehicleType: string;
  lat: number;
  lng: number;
  status: DriverStatus;
  currentLoad: number;
  acceptanceRate: number;
  experienceDays: number;
}
