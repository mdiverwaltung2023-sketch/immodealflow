"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

export default function BookmarkletPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "";
  const frontBase = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

  // Bookmarklet-Code als kompakter IIFE. Wir nutzen ein dynamisches
  // POST-Form (kein fetch), damit die CSP `connect-src`-Direktive der
  // Quell-Seite (z. B. immobilienscout24.de) den Aufruf nicht blockiert.
  // Der Frontend-Route-Handler `/bookmarklet/receive` nimmt die Daten
  // entgegen und ruft das Backend serverseitig (kein CSP-Problem).
  const bookmarkletSource = `
    (function(){
      var FRONT='${frontBase}';
      var bodyText=(document.body&&document.body.innerText||'').slice(0,80000);
      var pageUrl=window.location.href;
      var choice=prompt(
        'Infinity Oikos Import — was ist das?\\n\\n'+
        '1 = Einzelnes Inserat (Immoscout, Immowelt, Kleinanzeigen, ...)\\n'+
        '2 = Einzelne Versteigerung (ZVG-Bekanntmachung, einzelner Auktionstermin)\\n'+
        '3 = Liste / Katalog (DGA, SDL, Karhausen, mehrere Termine auf einer Seite)',
        '1'
      );
      if(!choice)return;
      var c=String(choice).trim();
      var mode;
      if(c==='1')mode='expose';
      else if(c==='2')mode='auction';
      else if(c==='3')mode='auction-list';
      else{alert('Ungueltige Wahl: '+c);return;}
      try{
        var f=document.createElement('form');
        f.method='POST';
        f.action=FRONT+'/bookmarklet/receive';
        f.target='_blank';
        f.enctype='application/x-www-form-urlencoded';
        f.style.display='none';
        function add(name,value){var i=document.createElement('input');i.type='hidden';i.name=name;i.value=value==null?'':String(value);f.appendChild(i);}
        add('mode',mode);
        add('text',bodyText);
        add('sourceUrl',pageUrl);
        document.body.appendChild(f);
        f.submit();
        setTimeout(function(){try{f.parentNode&&f.parentNode.removeChild(f);}catch(e){}},2000);
      }catch(e){
        alert('Infinity Oikos konnte das Form nicht senden:\\n\\n'+(e&&e.message||e));
      }
    })();
  `.replace(/\s+/g, " ").trim();
  // apiBase wird hier nicht mehr im Bookmarklet referenziert — der Aufruf
  // läuft jetzt server-zu-server über den Route-Handler.
  void apiBase;

  const bookmarkletHref = `javascript:${encodeURIComponent(bookmarkletSource)}`;

  return <BookmarkletPageInner bookmarkletHref={bookmarkletHref} bookmarkletSource={bookmarkletSource} />;
}

function BookmarkletPageInner({
  bookmarkletHref,
  bookmarkletSource
}: {
  bookmarkletHref: string;
  bookmarkletSource: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(bookmarkletHref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Infinity Oikos-Bookmarklet</div>
        <div className="mt-1 text-sm text-zinc-400">
          Ein-Klick-Import von jeder beliebigen Immobilien- oder Auktions-Seite. Funktioniert auch dort, wo unser Server-Crawler an JavaScript-Seiten scheitert (DGA, SDL, Immoscout24, Immowelt, Kleinanzeigen.de …).
        </div>
      </div>

      <Card title="Schritt 1 — Lesezeichen-Leiste einblenden">
        <div className="space-y-2 text-sm text-zinc-300">
          <p>Falls deine Lesezeichen-Leiste nicht sichtbar ist:</p>
          <ul className="list-disc pl-5 text-zinc-400">
            <li><strong>Chrome/Edge</strong>: <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">Strg + Umschalt + B</kbd></li>
            <li><strong>Firefox</strong>: Menü → Lesezeichen → Lesezeichen-Symbolleiste anzeigen</li>
            <li><strong>Safari</strong>: Darstellung → Favoriten-Leiste einblenden</li>
          </ul>
        </div>
      </Card>

      <Card title="Schritt 2 — Bookmarklet hinzufügen">
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Ziehe diesen Knopf <strong>per Drag-and-Drop</strong> in deine Lesezeichen-Leiste:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={bookmarkletHref}
              draggable={true}
              onClick={(e) => {
                e.preventDefault();
                alert("Drag-and-drop diesen Knopf in die Lesezeichen-Leiste — nicht klicken (sonst läuft das Bookmarklet auf dieser Infinity Oikos-Seite und findet kein Inserat).");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600"
            >
              ⤓ Infinity Oikos Import
            </a>

            <button
              onClick={copy}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              {copied ? "URL kopiert!" : "URL stattdessen kopieren"}
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Falls Drag-and-Drop nicht funktioniert: Knopf rechts kopiert dir die ganze URL — dann manuell ein neues Lesezeichen mit dieser URL anlegen.
          </p>
        </div>
      </Card>

      <Card title="Schritt 3 — Auf einer Inserats- oder Auktions-Seite klicken">
        <div className="space-y-3 text-sm text-zinc-300">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Du öffnest eine Inserats-Seite (z. B. <code>www.immoscout24.de/expose/...</code>)</li>
            <li>Du klickst in der Lesezeichen-Leiste auf <strong>Infinity Oikos Import</strong></li>
            <li>
              Eine kleine Abfrage erscheint — wähle:
              <ul className="mt-1 list-disc pl-5 text-zinc-400">
                <li><strong>1</strong> = einzelnes Inserat (Immoscout, Immowelt, Kleinanzeigen, normale Makler-Seite)</li>
                <li><strong>2</strong> = einzelne Versteigerung (ZVG-Termin, einzelne DGA-Auktion, einzelne SDL-Auktion)</li>
                <li><strong>3</strong> = Liste / Katalog (Übersichtsseite mit mehreren Auktionen)</li>
              </ul>
            </li>
            <li>Bei <strong>1</strong> oder <strong>2</strong>: ein neuer Infinity Oikos-Tab öffnet das frisch importierte Property mit Analyse + ggf. Bietlimit. Bei <strong>3</strong>: Sammelimport mit Anzeige der Anzahl.</li>
          </ol>

          <div className="mt-3 rounded-xl border border-amber-900 bg-amber-950/30 p-3 text-xs text-amber-200">
            <strong>Wichtig:</strong> Der Bookmarklet greift nur den sichtbaren Text der Seite ab und schickt ihn an dein Infinity Oikos-Backend. Es lädt keine externen Skripte und braucht keinerlei Einwilligung der Portale — du bist als User selbst auf der Seite.
          </div>
        </div>
      </Card>

      <Card title="Sourcecode (für Neugierige)">
        <details>
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white">
            Bookmarklet-Code anzeigen
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-zinc-950 p-3 text-xs text-zinc-300">
            <code>{bookmarkletSource}</code>
          </pre>
        </details>
      </Card>
    </div>
  );
}
