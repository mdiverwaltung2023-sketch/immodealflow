"use client";

import { useEffect, useState } from "react";
import { InvestorView } from "./InvestorView";
import { SellerView } from "./SellerView";
import { LandlordView } from "./LandlordView";
import { TenantView } from "./TenantView";
import {
  VIEW_MODE_EVENT,
  defaultModeForRole,
  getAllowedModes,
  readViewModeFor,
  type ViewMode
} from "@/components/viewMode";
import type {
  ListingT,
  MarketplaceListingT,
  PropertyListItemT,
  RatingSummaryT,
  SaleProcessListItemT,
  InquiryReceivedT,
  UserRoleT
} from "@/lib/api";

/**
 * Phase L7 — Dashboard streng nach effektivem ViewMode.
 *
 * Reine Rollen haben genau einen erlaubten Mode (= Default).
 * Multi-Rollen (BOTH, BROKER) wechseln per TopBar-Toggle.
 *
 * Mapping ViewMode -> Sub-View:
 *   INVESTOR -> InvestorView (Kauf, Marketplace)
 *   SELLER   -> SellerView (Inserate, Sales-Pipeline)
 *   LANDLORD -> LandlordView (Mietobjekte, Bewerber-Inbox)
 *   TENANT   -> TenantView (Mietbörse-Verknüpfung)
 */
export function DashboardSwitcher({
  role,
  properties,
  myListings,
  marketplace,
  saleProcesses,
  pendingInquiries
}: {
  role: UserRoleT;
  properties: PropertyListItemT[];
  myListings: ListingT[];
  marketplace: (MarketplaceListingT & { sellerRating?: RatingSummaryT | null })[];
  saleProcesses: SaleProcessListItemT[];
  pendingInquiries: InquiryReceivedT[];
}) {
  const allowed = getAllowedModes(role);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultModeForRole(role));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setViewMode(readViewModeFor(role));

    function onChange(e: Event) {
      const detail = (e as CustomEvent<ViewMode>).detail;
      if (allowed.includes(detail)) setViewMode(detail);
    }
    window.addEventListener(VIEW_MODE_EVENT, onChange);
    return () => window.removeEventListener(VIEW_MODE_EVENT, onChange);
  }, [role, allowed]);

  const effectiveMode = hydrated ? viewMode : defaultModeForRole(role);

  if (effectiveMode === "TENANT") return <TenantView />;
  if (effectiveMode === "LANDLORD") return <LandlordView />;
  if (effectiveMode === "SELLER") {
    return (
      <SellerView
        myListings={myListings}
        saleProcesses={saleProcesses}
        pendingInquiries={pendingInquiries}
      />
    );
  }
  return (
    <InvestorView
      properties={properties}
      myListings={myListings}
      marketplace={marketplace}
    />
  );
}
