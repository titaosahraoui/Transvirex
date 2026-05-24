export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface Invoice {
  id: string;
  missionId: string;
  clientName: string;
  amount: number;
  status: InvoiceStatus;
  generatedAt: string;
  paidAt?: string;
}

export interface CreateInvoiceRequest {
  missionId: string;
}

export interface UpdateInvoiceStatusRequest {
  status: InvoiceStatus;
}
