import type { Invoice, Supplier, MonthlyData, SupplierChartData } from "@/types";

export const MOCK_INVOICES: Invoice[] = [
  { id: 1,  invoice_number: "RE-2024-001", supplier_name: "Müller GmbH",      invoice_date: "2025-12-01", due_date: "2026-01-01", currency: "EUR", net_amount: 4200, tax_amount:  798, gross_amount:  4998, status: "paid",      created_at: "2025-12-01" },
  { id: 2,  invoice_number: "RE-2024-002", supplier_name: "Tech Solutions AG", invoice_date: "2026-01-05", due_date: "2026-02-05", currency: "EUR", net_amount: 8900, tax_amount: 1691, gross_amount: 10591, status: "processed", created_at: "2026-01-05" },
  { id: 3,  invoice_number: "RE-2024-003", supplier_name: "Büroservice KG",    invoice_date: "2026-01-12", due_date: "2026-02-12", currency: "EUR", net_amount:  650, tax_amount:  123, gross_amount:   773, status: "pending",   created_at: "2026-01-12" },
  { id: 4,  invoice_number: "RE-2024-004", supplier_name: "Logistik Nord GmbH",invoice_date: "2026-01-18", due_date: "2026-02-18", currency: "EUR", net_amount: 3100, tax_amount:  589, gross_amount:  3689, status: "paid",      created_at: "2026-01-18" },
  { id: 5,  invoice_number: "RE-2024-005", supplier_name: "Müller GmbH",       invoice_date: "2026-02-02", due_date: "2026-03-02", currency: "EUR", net_amount: 5600, tax_amount: 1064, gross_amount:  6664, status: "processed", created_at: "2026-02-02" },
  { id: 6,  invoice_number: "RE-2024-006", supplier_name: "Cloud Systems Ltd", invoice_date: "2026-02-10", due_date: "2026-03-10", currency: "EUR", net_amount: 1200, tax_amount:  228, gross_amount:  1428, status: "error",     created_at: "2026-02-10" },
  { id: 7,  invoice_number: "RE-2024-007", supplier_name: "Tech Solutions AG", invoice_date: "2026-02-14", due_date: "2026-03-14", currency: "EUR", net_amount: 7400, tax_amount: 1406, gross_amount:  8806, status: "pending",   created_at: "2026-02-14" },
  { id: 8,  invoice_number: "RE-2024-008", supplier_name: "Büroservice KG",    invoice_date: "2026-02-20", due_date: "2026-03-20", currency: "EUR", net_amount:  890, tax_amount:  169, gross_amount:  1059, status: "paid",      created_at: "2026-02-20" },
  { id: 9,  invoice_number: "RE-2024-009", supplier_name: "Logistik Nord GmbH",invoice_date: "2026-03-01", due_date: "2026-04-01", currency: "EUR", net_amount: 4500, tax_amount:  855, gross_amount:  5355, status: "processed", created_at: "2026-03-01" },
  { id: 10, invoice_number: "RE-2024-010", supplier_name: "Müller GmbH",       invoice_date: "2026-03-05", due_date: "2026-04-05", currency: "EUR", net_amount: 3800, tax_amount:  722, gross_amount:  4522, status: "pending",   created_at: "2026-03-05" },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 1, name: "Müller GmbH",        total_invoices: 3, total_amount: 16184, last_invoice_date: "2026-03-05" },
  { id: 2, name: "Tech Solutions AG",  total_invoices: 2, total_amount: 19397, last_invoice_date: "2026-02-14" },
  { id: 3, name: "Büroservice KG",     total_invoices: 2, total_amount:  1832, last_invoice_date: "2026-02-20" },
  { id: 4, name: "Logistik Nord GmbH", total_invoices: 2, total_amount:  9044, last_invoice_date: "2026-03-01" },
  { id: 5, name: "Cloud Systems Ltd",  total_invoices: 1, total_amount:  1428, last_invoice_date: "2026-02-10" },
];

export const MOCK_MONTHLY_DATA: MonthlyData[] = [
  { month: "Sep", count: 4,  amount: 18400 },
  { month: "Okt", count: 6,  amount: 27300 },
  { month: "Nov", count: 5,  amount: 22100 },
  { month: "Dez", count: 8,  amount: 34800 },
  { month: "Jan", count: 7,  amount: 29900 },
  { month: "Feb", count: 9,  amount: 41200 },
  { month: "Mär", count: 6,  amount: 25600 },
];

export const MOCK_SUPPLIER_CHART: SupplierChartData[] = [
  { name: "Tech Solutions",  amount: 19397 },
  { name: "Müller GmbH",     amount: 16184 },
  { name: "Logistik Nord",   amount:  9044 },
  { name: "Cloud Systems",   amount:  1428 },
  { name: "Büroservice KG",  amount:  1832 },
];
