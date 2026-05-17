import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import { fetchSuppliers } from "@/services/api";
import { MOCK_SUPPLIERS } from "@/lib/mockData";
import type { Supplier } from "@/types";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchSuppliers();
        setSuppliers(data);
      } catch (err) {
        // Only fall back to mock data when the backend is genuinely unreachable.
        // Auth errors (401) are handled globally in api.ts.
        if (isAxiosError(err) && !err.response) {
          setSuppliers(MOCK_SUPPLIERS);
          setError("Backend nicht erreichbar – Beispieldaten werden angezeigt.");
        } else {
          setError("Fehler beim Laden der Lieferanten.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { suppliers, loading, error };
}
