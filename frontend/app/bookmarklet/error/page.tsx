import Link from "next/link";
import { Card } from "@/components/ui";

export default function BookmarkletErrorPage({
  searchParams
}: {
  searchParams?: { msg?: string };
}) {
  const msg = searchParams?.msg ?? "Unbekannter Fehler";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Import fehlgeschlagen</div>
        <div className="mt-1 text-sm text-zinc-500">
          Das Bookmarklet konnte den Inhalt nicht importieren.
        </div>
      </div>

      <Card title="Fehlermeldung">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {msg}
        </pre>
      </Card>

      <Card title="Was du jetzt tun kannst">
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Auf der Inserats-Seite kurz scrollen, damit alle Inhalte geladen sind, dann erneut klicken.</li>
          <li>Bei Listen-Modus prüfen, dass die Übersichts-/Suchergebnisseite gerendert ist (nicht ein Login-Wall).</li>
          <li>
            Manuell weiterhin verfügbar: <Link className="text-indigo-600 hover:text-indigo-700 underline" href="/auctions/import">Versteigerung importieren</Link> · <Link className="text-indigo-600 hover:text-indigo-700 underline" href="/new">Neues Objekt</Link>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
