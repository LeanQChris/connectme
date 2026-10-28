import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/inbox" />
    </main>
  );
}
