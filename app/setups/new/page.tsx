import { Suspense } from "react";
import Link from "next/link";
import { SetupNewClient } from "./setup-new-client";

export default function NewSetupPage() {
  return (
    <main className="min-h-screen bg-[#efefef] py-6">
      <div className="mx-auto max-w-[1600px] px-4 space-y-4">
        <header className="border border-slate-500 bg-[#3a3a3a] px-4 py-3 text-white">
          <Link
            href="/"
            className="inline-flex items-center rounded-sm border border-white px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ← Home
          </Link>
        </header>

        <Suspense fallback={null}>
          <SetupNewClient />
        </Suspense>
      </div>
    </main>
  );
}
