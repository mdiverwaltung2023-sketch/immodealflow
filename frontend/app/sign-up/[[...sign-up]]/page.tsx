import { SignUp } from "@clerk/nextjs";
import { AuthHero } from "@/components/AuthHero";

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero headlineLine1="Verkaufen oder kaufen." headlineLine2="Mit Profil-Transparenz." />

      <div className="flex items-center justify-center bg-zinc-50 p-6 lg:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-zinc-900">Konto erstellen</div>
            <div className="mt-1 text-sm text-zinc-500">
              In wenigen Sekunden registriert. Wähle deine Rolle nach dem Login.
            </div>
          </div>
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden"
              }
            }}
            signInUrl="/sign-in"
            forceRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
