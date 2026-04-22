import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="min-h-[calc(100vh-0px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign In / Join Pool
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to your existing account, or join the pool using an invite code.
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 text-xs text-zinc-600 dark:text-zinc-400">
          <span>Need a code? Ask the admin.</span>{" "}
          <Link className="underline underline-offset-2" href="/">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
