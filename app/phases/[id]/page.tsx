import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PHASES } from '../../../lib/phases';
import { PhaseScreen } from '../PhaseScreen';
import BackButton from '../../components/BackButton';

export default function PhasePage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { cycle?: string };
}) {
  const id = Number(params.id);
  const phase = PHASES.find((p) => p.id === id);
  const cycleId = searchParams?.cycle;

  if (!phase) {
    notFound();
  }

  const currentIndex = PHASES.findIndex((p) => p.id === phase.id);
  void currentIndex;

  return (
    <main className="min-h-screen bg-[#efefef] py-6">
      <div className="mx-auto max-w-[1600px] px-4 space-y-4">
        <header>
          <div className="border border-slate-500 bg-[#3a3a3a] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center rounded-sm border border-white px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                ← Home
              </Link>
              <BackButton />
            </div>
          </div>
        </header>

        <PhaseScreen phaseId={phase.id} cycleId={cycleId} phaseName={phase.name} />

      </div>
    </main>
  );
}
