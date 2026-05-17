import axios, { type AxiosError } from "axios";
import type {
  Invoice,
  Supplier,
  UploadResult,
  TokenResponse,
  LoginCredentials,
  RegisterData,
} from "@/types";

export const TOKEN_KEY = "invoice_auth_token";

// ── Axios instance ────────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request when available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: clear stored token and redirect to login
client.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Only redirect if not already on /login to prevent infinite loops
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    console.warn("[API]", err.message);
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login – OAuth2 Password Flow.
 * The backend expects application/x-www-form-urlencoded with fields
 * `username` (= email) and `password`.
 */
export async function login(credentials: LoginCredentials): Promise<TokenResponse> {
  const body = new URLSearchParams({
    username: credentials.email,
    password: credentials.password,
  });
  const { data } = await client.post<TokenResponse>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

/**
 * POST /auth/register – Create a new company + admin user.
 */
export async function register(payload: RegisterData): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>("/auth/register", payload);
  return data;
}

/**
 * GET /auth/me – Fetch the currently authenticated user profile.
 */
export async function fetchMe() {
  const { data } = await client.get("/auth/me");
  return data;
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export interface InvoiceFilters {
  supplier?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export async function fetchInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
  const { data } = await client.get<Invoice[]>("/invoices", { params: filters });
  return data;
}

export async function fetchInvoice(id: number): Promise<Invoice> {
  const { data } = await client.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function uploadInvoice(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post<UploadResult>("/invoices/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data } = await client.get<Supplier[]>("/suppliers");
  return data;
}

export { client };
