import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Art Speaks | Create account",
  description: "Create an Art Speaks account.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-margin-mobile py-12 bg-background">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] p-8 border-2 border-candy-pink/30 shadow-xl">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary mb-1 inline-block"
          >
            Art Speaks
          </Link>
          <p className="text-body-md text-on-surface-variant">Create account</p>
        </div>

        <SignupForm />

        <p className="text-body-md text-on-surface-variant text-center mt-6">
          Already have one?{" "}
          <Link href="/login" className="underline hover:text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
