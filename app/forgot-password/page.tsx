import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Art Speaks | Reset your password",
  description: "Send yourself a link to set a new password.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-margin-mobile bg-background">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] p-8 border-2 border-candy-pink/30 shadow-xl">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary mb-1 inline-block"
          >
            Art Speaks
          </Link>
          <p className="text-body-md text-on-surface-variant">
            Forgotten your password
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-body-md text-on-surface-variant text-center mt-6">
          Remembered it?{" "}
          <Link href="/login" className="underline hover:text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
