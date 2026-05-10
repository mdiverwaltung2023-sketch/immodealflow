"use client";

import { useEffect, useState } from "react";
import { InvestorView } from "./InvestorView";
import { SellerView } from "./SellerView";
import { LandlordView } from "./LandlordView";
import {
  VIEW_MODE_STORAGE_KEY,
  VIEW_MODE_EVENT,
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
 * Phase J5 — Dashboard rollen- und viewMode-abhaengig.
 *
 * Server-Component liefert ALLE Daten parallel; Switcher entscheidet
 * Client-side, welche Sub-View gerendert wird:
 *   - role=SELLER  -> SellerView
 *   - role=INVESTOR -> InvestorView
 *   - role=BOTH oder BROKER:
 *       viewMode=SELLER   -> SellerView
 *       viewMode=INVESTOR -> InvestorView
 *       viewMode=BOTH/null -> InvestorView (Default — bisheriges Verhalten)
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
  const [viewMode, setViewMode] = useState<ViewMode>("BOTH");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (role !== "BOTH" && role !== "BROKER") return;
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (
        saved === "INVESTOR" ||
        saved === "SELLER" ||
        saved === "BOTH" ||
        saved === "LANDLORD"
      ) {
        setViewMode(saved);
      }
    } catch {
      /* ignore */
    }
    function onChange(e: Event) {
      const detail = (e as CustomEvent<ViewMode>).detail;
      if (
        detail === "INVESTOR" ||
        detail === "SELLER" ||
        detail === "BOTH" ||
        detail === "LANDLORD"
      ) {
        setViewMode(detail);
      }
    }
    window.addEventListener(VIEW_MODE_EVENT, onChange);
    return () => window.removeEventListener(VIEW_MODE_EVENT, onChange);
  }, [role]);

  // Vor Hydration: Default Investor-View, damit Hydration nicht flickert.
  const showLandlord =
    role === "LANDLORD" ||
    ((role === "BOTH" || role === "BROKER") && hydrated && viewMode === "LANDLORD");
  const showSeller =
    role === "SELLER" ||
    ((role === "BOTH" || role === "BROKER") && hydrated && viewMode === "SELLER");

  if (showLandlord) return <LandlordView />;
  if (showSeller) {
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
