"use client";

import { useState } from "react";
import type { ListingImageT } from "@/lib/api";

type Props = {
  images: ListingImageT[];
  title: string;
};

export function ImageGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-400">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5-9 9" />
        </svg>
        <span>Keine Bilder hochgeladen</span>
      </div>
    );
  }

  const main = images[active];
  const thumbs = images.slice(0, 5);
  const restCount = images.length - thumbs.length;

  return (
    <>
      {/* Galerie-Grid: Main + 4 Thumbs */}
      <div className="grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto overflow-hidden bg-zinc-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main.url}
            alt={main.alt ?? title}
            className="h-full w-full object-cover transition hover:scale-[1.02]"
          />
        </button>

        {thumbs.slice(0, 4).map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              setActive(i);
              setLightbox(true);
            }}
            className="relative hidden aspect-[4/3] overflow-hidden bg-zinc-100 md:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? `${title} ${i + 1}`}
              className="h-full w-full object-cover transition hover:scale-[1.02]"
            />
            {/* Auf dem 4. Thumb (Index 3) Rest-Counter */}
            {i === 3 && restCount > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                +{restCount} Bilder
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {/* Mobile Pager */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActive(i)}
            className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
              i === active ? "border-indigo-500" : "border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ""}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox-Overlay */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Schließen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((i) => (i - 1 + images.length) % images.length);
                }}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Vorheriges Bild"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((i) => (i + 1) % images.length);
                }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Nächstes Bild"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </>
          ) : null}

          <div
            className="max-h-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[active].url}
              alt={images[active].alt ?? title}
              className="max-h-[88vh] w-auto rounded-lg object-contain"
            />
            <div className="mt-3 text-center text-xs text-white/70">
              {active + 1} / {images.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
