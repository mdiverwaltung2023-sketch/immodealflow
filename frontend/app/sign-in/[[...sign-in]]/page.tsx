import { SignIn } from "@clerk/nextjs";
import { AuthHero } from "@/components/AuthHero";

export default function SignInPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero headlineLine1="Ihre Investoren." headlineLine2="Vor der ersten Anfrage transparent." />

      <div className="flex items-center justify-center bg-zinc-50 p-6 lg:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-zinc-900">Anmelden</div>
            <div className="mt-1 text-sm text-zinc-500">
              Willkommen zurück. Melde dich an, um auf den Marketplace zuzugreifen.
            </div>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden"
              }
            }}
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
