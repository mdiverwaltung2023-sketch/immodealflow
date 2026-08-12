"use client";

import { Button } from "@/components/ui";

// Druck/PDF-Button. Öffnet den Browser-Druckdialog -> "Als PDF speichern".
// Per @media print (siehe page.tsx) wird nur das Exposé (#expose) gedruckt,
// nicht die App-Navigation. Für farbige Flächen/Charts muss im Druckdialog
// "Hintergrundgrafiken" aktiviert sein.
export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>Drucken / als PDF speichern</Button>
  );
}
