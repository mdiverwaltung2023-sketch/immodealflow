import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Upload,
  Settings,
  Zap,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/",          label: "Dashboard",   icon: LayoutDashboard },
  { to: "/invoices",  label: "Invoices",    icon: FileText        },
  { to: "/suppliers", label: "Suppliers",   icon: Building2       },
  { to: "/upload",    label: "Upload",      icon: Upload          },
  { to: "/settings",  label: "Settings",    icon: Settings        },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full w-64 flex flex-col",
          "bg-[#0b0f19] border-r border-white/[0.06]",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
              <Zap className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-white font-semibold tracking-tight text-sm">
              InvoiceAI
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Menü
          </p>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-500/15 text-indigo-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-indigo-400" : "text-slate-500"
                    )}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user info + logout */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-300 font-medium truncate">
                {user?.full_name ?? "Nutzer"}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={logout}
              title="Abmelden"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
