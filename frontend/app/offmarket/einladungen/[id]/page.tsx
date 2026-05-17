import Link from "next/link";
import { z } from "zod";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import {
  OffmarketLeadSchema,
  OffmarketAnonLeadSchema,
  OffmarketInviteStatusEnum,
  OffmarketImageSchema,
  OFFMARKET_INVITE_STATUS_LABELS,
  UserRoleEnum,
  ProfileVisibilityEnum,
  AssetTypeEnum,
  AffordabilitySchema,
  TrackrecordItemSchema,
  ASSET_TYPE_LABELS
} from "@/lib/api";
import { OffmarketImage } from "@/components/OffmarketImage";
import { InviteResponseForm } from "./InviteResponseForm";
import { ChatThread } from "./ChatThread";

export const dynamic = "force-dynamic";

const InviteDetailSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  status: OffmarketInviteStatusEnum,
  ownerNote: z.string().nullable().optional(),
  investorNote: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  role: z.enum(["owner", "investor"]),
  lead: z.union([OffmarketLeadSchema, OffmarketAnonLeadSchema]).and(
    z.object({ images: z.array(OffmarketImageSchema).optional() }).partial()
  ),
  owner: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().optional(),
    role: UserRoleEnum
  }),
  investor: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().optional().nullable(),
    role: UserRoleEnum,
    investorProfile: z
      .object({
        bio: z.string().nullable().optional(),
        investmentExperienceYears: z.number(),
        equity: z.number().nullable().optional(),
        monthlyIncome: z.number().nullable().optional(),
        monthlyDebt: z.number().nullable().optional(),
        financingPreApproved: z.boolean(),
        financingNote: z.string().nullable().optional(),
        preferredAssetTypes: z.array(AssetTypeEnum),
        preferredRegions: z.array(z.string()),
        minTicketSize: z.number().nullable().optional(),
        maxTicketSize: z.number().nullable().optional(),
        visibility: ProfileVisibilityEnum
      })
      .nullable()
      .optional(),
    trackrecordItems: z.array(TrackrecordItemSchema).optional()
  }),
  canChat: z.boolean()
});

export default async function InviteDetailPage({
  params
}: {
  params: { id: string };
}) {
  await requireOnboardedUser();
  const inv = await apiGet(
    `/me/offmarket-invites/${params.id}`,
    InviteDetailSchema
  );
  const lead = inv.lead as {
    id: string;
    title: string;
    propertyType: string;
    approxArea: number;
    approxPrice: number;
    approxRent?: number | null;
    description: string;
    highlights?: string[];
    city: string;
    district?: string | null;
    fullAddress?: string | null;
    location?: string;
    images?: Array<{
      id: string;
      originalUrl?: string | null;
      blurredUrl?: string | null;
      stylizedUrl?: string | null;
      alt?: string | null;
      caption?: string | null;
      sortOrder: number;
    }>;
  };

  const isAccepted = inv.status === "ACCEPTED";

  return (
    <div className="space-y-6">
      <Link
        href="/offmarket/einladungen"
        className="text-xs text-zinc-500 hover:text-zinc-700"
      >
        ← Meine Offmarket-Einladungen
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Offmarket-Einladung
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {lead.title}
          </h1>
          <div className="mt-1 text-sm text-zinc-600">
            {ASSET_TYPE_LABELS[lead.propertyType as keyof typeof ASSET_TYPE_LABELS]} ·{" "}
            {lead.location ?? lead.city} · {lead.approxArea} m²
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {OFFMARKET_INVITE_STATUS_LABELS[inv.status]}
        </span>
      </div>

      {/* Objekt-Card */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 to-white p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <div className="text-[11px] text-zinc-500">Wunschpreis</div>
            <div className="text-2xl font-semibold text-amber-700">
              {lead.approxPrice.toLocaleString("de-DE")} €
            </div>
            {lead.approxRent && (
              <div className="mt-1 text-xs text-zinc-500">
                {lead.approxRent.toLocaleString("de-DE")} € Miete / Monat
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Lage</div>
            <div className="text-sm font-medium text-zinc-900">
              {isAccepted && lead.fullAddress
                ? lead.fullAddress
                : lead.location ?? lead.city}
            </div>
            {!isAccepted && (
              <div className="mt-0.5 text-[11px] text-zinc-500">
                Volle Adresse erst nach Annahme
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Eingegangen</div>
            <div className="text-sm font-medium text-zinc-900">
              {new Date(inv.createdAt).toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        {(lead.images?.length ?? 0) > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
            {lead.images?.map((img) => (
              <div key={img.id} className="aspect-[4/3] overflow-hidden rounded-xl">
                <OffmarketImage
                  image={{
                    id: img.id,
                    originalUrl: img.originalUrl ?? null,
                    blurredUrl: img.blurredUrl ?? null,
                    stylizedUrl: img.stylizedUrl ?? null,
                    alt: img.alt ?? null,
                    caption: img.caption ?? null,
                    sortOrder: img.sortOrder
                  }}
                  mode={isAccepted ? "full" : "anon"}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 whitespace-pre-line rounded-lg bg-white/70 p-3 text-sm text-zinc-700">
          {lead.description}
        </div>

        {(lead.highlights ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(lead.highlights ?? []).map((h) => (
              <span
                key={h}
                className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Owner-Notiz */}
      {inv.ownerNote && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Persönliche Nachricht des Eigentümers
          </div>
          <div className="mt-2 whitespace-pre-line text-sm italic text-zinc-700">
            "{inv.ownerNote}"
          </div>
        </div>
      )}

      {/* Eigene vorige Antwort */}
      {inv.investorNote && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Ihre Antwort
          </div>
          <div className="mt-2 whitespace-pre-line text-sm text-zinc-700">
            {inv.investorNote}
          </div>
        </div>
      )}

      {/* Eigentümer-Kontakt freigegeben */}
      {isAccepted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Kontakt freigeschaltet
          </div>
          <div className="mt-2 text-sm text-zinc-900">
            <div>
              <strong>Eigentümer:</strong> {inv.owner.name ?? "—"}
            </div>
            <div>
              <strong>E-Mail:</strong>{" "}
              <a
                href={`mailto:${inv.owner.email}`}
                className="text-emerald-700 underline"
              >
                {inv.owner.email ?? "—"}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Respond-Form fuer Investor, wenn PENDING */}
      {inv.role === "investor" && inv.status === "PENDING" && (
        <InviteResponseForm inviteId={inv.id} />
      )}

      {/* Chat */}
      {inv.canChat && <ChatThread inviteId={inv.id} />}
    </div>
  );
}
