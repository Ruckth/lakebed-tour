import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk-config";

export default function SignUpPage() {
  const enabled = isClerkConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-24">
      {enabled ? (
        <SignUp routing="hash" />
      ) : (
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
          <h1 className="font-serif text-3xl font-semibold text-foreground">Create account</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Clerk is optional in this migration. Add Clerk publishable and secret keys
            to enable auth.
          </p>
        </div>
      )}
    </div>
  );
}
