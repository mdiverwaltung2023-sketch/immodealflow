import { apiGet, PropertyDetailSchema } from "@/lib/api";
import { Card } from "@/components/ui";
import { EditForm } from "./EditForm";
import Link from "next/link";

export default async function PropertyEditPage({ params }: { params: { id: string } }) {
  const p = await apiGet(`/properties/${params.id}`, PropertyDetailSchema);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Objekt bearbeiten</div>
          <div className="mt-1 text-sm text-zinc-400">{p.title}</div>
        </div>
        <Link href={`/property/${p.id}`} className="text-sm text-zinc-300 hover:underline">
          ← Zurück
        </Link>
      </div>

      <Card title="Felder anpassen">
        <EditForm
          id={p.id}
          initial={{
            title: p.title,
            price: String(p.price),
            rent: String(p.rent),
            location: p.location,
            size: String(p.size),
            status: p.status
          }}
        />
      </Card>
    </div>
  );
}
