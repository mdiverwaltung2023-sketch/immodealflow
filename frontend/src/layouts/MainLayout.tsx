import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/":          "Dashboard",
  "/invoices":  "Invoices",
  "/suppliers": "Suppliers",
  "/upload":    "Upload",
  "/settings":  "Settings",
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] ?? "InvoiceAI";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[17px] font-semibold text-slate-800">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
