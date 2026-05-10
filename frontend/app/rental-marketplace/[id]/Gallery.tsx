"use client";

import { useState } from "react";
import type { RentalUnitImageT } from "@/lib/api";

export function Gallery({ images }: { images: RentalUnitImageT[] }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400">
        Keine Bilder verfügbar
      </div>
    );
  }

  const main = images[active];
  const others = images.filter((_, i) => i !== active).slice(0, 4);

  return (
    <>
      <div className="grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setLightbox(active)}
          className="md:col-span-2 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
        >
          <div className="relative aspect-[16/10] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={main.url}
              alt={main.alt ?? "Wohnungsbild"}
              className="h-full w-full object-cover"
            />
          </div>
        </button>
        <div className="grid grid-cols-2 gap-2">
          {others.map((img) => {
            const realIndex = images.findIndex((x) => x.id === img.id);
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(realIndex)}
                className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-indigo-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? "Wohnungsbild"}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
          {images.length > 5 ? (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
              +{images.length - 5} weitere
            </div>
          ) : null}
        </div>
      </div>

      {lightbox !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((x) => (x === null ? null : (x - 1 + images.length) % images.length));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Vorheriges Bild"
          >
            ←
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox].url}
            alt={images[lightbox].alt ?? "Wohnungsbild"}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((x) => (x === null ? null : (x + 1) % images.length));
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Nächstes Bild"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
          >
            Schließen
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
            {lightbox + 1} / {images.length}
          </div>
        </div>
      ) : null}
    </>
  );
}
