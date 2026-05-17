import { Settings, Bell, Database, Key, Shield, Sliders } from "lucide-react";

const SECTIONS = [
  {
    icon: Key,
    title: "API-Verbindung",
    description: "FastAPI-Backend-URL und Authentifizierungs-Token konfigurieren.",
    fields: [
      { label: "Backend URL", type: "text",     placeholder: "http://localhost:8000", value: "http://localhost:8000" },
      { label: "API Token",   type: "password",  placeholder: "sk-…",                 value: "" },
    ],
  },
  {
    icon: Database,
    title: "Datenbank",
    description: "PostgreSQL-Verbindungseinstellungen (werden vom Backend gelesen).",
    fields: [
      { label: "Host",     type: "text", placeholder: "localhost", value: "localhost" },
      { label: "Port",     type: "text", placeholder: "5432",      value: "5432"      },
      { label: "Datenbank",type: "text", placeholder: "invoices",  value: "invoices"  },
    ],
  },
  {
    icon: Bell,
    title: "Benachrichtigungen",
    description: "E-Mail-Benachrichtigungen bei neuen Rechnungen oder Fehlern.",
    toggles: [
      { label: "Neue Rechnung erkannt",    default: true  },
      { label: "Verarbeitungsfehler",       default: true  },
      { label: "Wöchentlicher Report",      default: false },
    ],
  },
  {
    icon: Shield,
    title: "Sicherheit",
    description: "Zugriffsrechte und Sitzungseinstellungen.",
    toggles: [
      { label: "Zwei-Faktor-Authentifizierung", default: false },
      { label: "Sitzung nach 30 min beenden",   default: true  },
    ],
  },
];

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div
      className={[
        "relative h-5 w-9 rounded-full transition-colors cursor-pointer",
        checked ? "bg-indigo-600" : "bg-slate-200",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Sliders className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Einstellungen</h2>
          <p className="text-sm text-slate-400">Systemkonfiguration und Präferenzen</p>
        </div>
      </div>

      {SECTIONS.map(({ icon: Icon, title, description, fields, toggles }) => (
        <div
          key={title}
          className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden"
        >
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 flex-shrink-0">
              <Icon className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {fields?.map(({ label, type, placeholder, value }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  defaultValue={value}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 rounded-lg border border-slate-200 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
            ))}

            {toggles?.map(({ label, default: on }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <Toggle checked={on} />
              </div>
            ))}
          </div>

          {fields && (
            <div className="px-6 pb-5">
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm">
                Speichern
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-400">
        <Settings className="h-4 w-4 flex-shrink-0" />
        InvoiceAI v1.0.0 · FastAPI Backend · PostgreSQL · OpenAI GPT-4o
      </div>
    </div>
  );
}
