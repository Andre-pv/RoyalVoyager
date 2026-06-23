import { prisma } from '@/lib/prisma';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { getCruiseFilters } from './actions/cruise';

export default async function Page() {
  const cruiseCount = await prisma.cruise.count();
  const filters = await getCruiseFilters();

  if (cruiseCount === 0) {
    return (
      <div className="bg-slate-950 font-body text-slate-100 min-h-screen flex flex-col">
        {/* TOP NAV SIMPLIFIED */}
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/80 border-b border-slate-800">
          <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white">Royal Voyager</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/search" className="hover:text-white transition-colors">
                <span className="material-symbols-outlined">search</span>
              </Link>
            </div>
          </div>
        </header>

        {/* EMPTY STATE */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[url('https://images.unsplash.com/photo-1599640842225-85d111c60e6b?q=80&w=2000')] bg-cover bg-center relative">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="material-symbols-outlined text-blue-500/50 text-8xl mb-6 animate-pulse">sailing</span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">Voyages Incoming</h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl text-center mb-10 leading-relaxed font-medium">
              The Royal Voyager fleet is currently undergoing maintenance and seasonal preparation. Please check back shortly for our new selection of breathtaking itineraries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const featuredCruises = await prisma.cruise.findMany({
    take: 4,
    orderBy: { basePrice: 'desc' },
    include: { region: true }
  });

  return <HomeClient filters={filters} featuredCruises={featuredCruises} />;
}
