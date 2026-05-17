// ── Auth types ────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "member";
  company_id: number;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}

// ── Invoice types ─────────────────────────────────────────────────────────────

export type InvoiceStatus = "pending" | "processed" | "error" | "paid";

export interface Invoice {
  id: number;
  invoice_number: string;
  supplier_name: string;
  invoice_date: string;
  due_date?: string;
  currency: string;
  net_amount: number;
  tax_amount: number;
  gross_amount: number;
  status: InvoiceStatus;
  pdf_path?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  total_invoices: number;
  total_amount: number;
  last_invoice_date: string;
}

export interface MonthlyData {
  month: string;
  count: number;
  amount: number;
}

export interface SupplierChartData {
  name: string;
  amount: number;
}

export interface UploadResult {
  message: string;
  invoice_id?: number;
  status: "success" | "error" | "processing";
}
