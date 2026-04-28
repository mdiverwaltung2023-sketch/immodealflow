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
        <div className="text-2xl font-semibold">Import fehlgeschlagen</div>
        <div className="mt-1 text-sm text-zinc-400">
          Das Bookmarklet konnte den Inhalt nicht importieren.
        </div>
      </div>

      <Card title="Fehlermeldung">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border bg-zinc-950 p-3 text-sm text-rose-300">
          {msg}
        </pre>
      </Card>

      <Card title="Was du jetzt tun kannst">
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
          <li>Auf der Inserats-Seite kurz scrollen, damit alle Inhalte geladen sind, dann erneut klicken.</li>
          <li>Bei Listen-Modus prüfen, dass die Übersichts-/Suchergebnisseite gerendert ist (nicht ein Login-Wall).</li>
          <li>
            Manuell weiterhin verfügbar: <Link className="underline" href="/auctions/import">Versteigerung importieren</Link> · <Link className="underline" href="/new">Neues Objekt</Link>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
