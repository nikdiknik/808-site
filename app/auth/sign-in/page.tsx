import Link from "next/link";

import { SignInPanel } from "@/components/auth/sign-in-panel";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-white">
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-[1180px]">
        <Link href="/app" className="heading-font mb-6 inline-flex rounded-full bg-[#303030] px-4 py-2 text-[12px] uppercase text-[#78F761]">
          808 Демок
        </Link>
        <SignInPanel initialError={params.error} />
      </div>
    </main>
  );
}
