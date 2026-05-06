import { requireOnboardedUser } from "@/lib/api-server";
import type { ReactNode } from "react";

export default async function AuctionsLayout({ children }: { children: ReactNode }) {
  await requireOnboardedUser();
  return <>{children}</>;
}
