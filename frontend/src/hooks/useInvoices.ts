import { useState, useEffect, useCallback } from "react";
import { isAxiosError } from "axios";
import { fetchInvoices, type InvoiceFilters } from "@/services/api";
import { MOCK_INVOICES } from "@/lib/mockData";
import type { Invoice } from "@/types";

export function useInvoices(filters?: InvoiceFilters) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices(filters);
      setInvoices(data);
    } catch (err) {
      // Only fall back to mock data when the backend is genuinely unreachable
      // (network error = no response object).
      // HTTP errors like 401/403 are handled globally by the axios interceptor
      // in api.ts (redirects to /login), so we don't need mock data for those.
      if (isAxiosError(err) && !err.response) {
        setInvoices(MOCK_INVOICES);
        setError("Backend nicht erreichbar – Beispieldaten werden angezeigt.");
      } else {
        setError("Fehler beim Laden der Rechnungen.");
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return { invoices, loading, error, refetch: load };
}
