"use client";

import { Button } from "@/components/ui";

// Druck/PDF-Button. Browser-Druckdialog -> "Als PDF speichern".
// Per @media print wird nur die Mappe (#mappe) gedruckt, nicht die App.
export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>Drucken / als PDF speichern</Button>
  );
}
