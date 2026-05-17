import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FileText, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Tab = "login" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [tab, setTab]             = useState<Tab>("login");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Login fields
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");

  // Register extra fields
  const [fullName, setFullName]   = useState("");
  const [company, setCompany]     = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, full_name: fullName, company_name: company });
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg mb-3">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">InvoiceAI</h1>
          <p className="text-sm text-slate-500 mt-1">Rechnungsautomatisierung</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-8">

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "login" ? "Anmelden" : "Registrieren"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-100 mb-5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Register-only fields */}
            {tab === "register" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Vollständiger Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Unternehmensname
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Muster GmbH"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Passwort
                </label>
                {tab === "login" && (
                  <Link
                    to="#"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Vergessen?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={tab === "register" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "register" ? "Mindestens 8 Zeichen" : "••••••••"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === "login" ? "Anmelden" : "Konto erstellen"}
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          InvoiceAI · Rechnungsautomatisierung
        </p>
      </div>
    </div>
  );
}
