import Image from 'next/image';
import { SetupsTableClient } from './SetupsTableClient';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#efefef] py-0">
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-slate-700 bg-[#343434] px-4 py-4 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/AbbVie_logo.svg%20(1).png"
                alt="AbbVie"
                width={132}
                height={36}
                priority
              />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Forecast Management System</h1>
                <p className="mt-1 text-sm text-slate-300">
                  Core mockup aligned to the previous Power Apps-style program layout.
                </p>
              </div>
            </div>

            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
              Mock-up only
            </div>
          </div>
        </header>

        <section className="px-0 py-0">
          <SetupsTableClient />
        </section>
      </div>
    </main>
  );
}