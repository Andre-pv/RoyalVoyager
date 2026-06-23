"use client";

import { useState, useRef, useEffect } from 'react';
import { useBookingStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SearchClient({ 
  cruises, 
  recommendations = [], 
  searchParams,
  filters
}: { 
  cruises: any[], 
  recommendations?: any[], 
  searchParams?: any,
  filters: { ports: string[], regions: { region: string, items: string[] }[] }
}) {
  const router = useRouter();
  const setCruise = useBookingStore((state: any) => state.setCruise);
  
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isDestOpen, setIsDestOpen] = useState(false);
  const [searchDate, setSearchDate] = useState(searchParams?.date || '');
  const [searchSource, setSearchSource] = useState(searchParams?.source || 'Any Port');
  const [searchDest, setSearchDest] = useState(searchParams?.dest || 'Where to wander?');

  const sourceRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node)) setIsSourceOpen(false);
      if (destRef.current && !destRef.current.contains(e.target as Node)) setIsDestOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchTrigger = () => {
    const params = new URLSearchParams();
    if (searchSource !== 'Any Port') params.set('source', searchSource);
    if (searchDest !== 'Where to wander?') params.set('dest', searchDest);
    if (searchDate) params.set('date', searchDate);
    router.push(`/search?${params.toString()}`);
  };

  const getWeekDays = () => {
    const base = searchDate ? new Date(searchDate) : new Date();
    const days = [];
    for (let i = -2; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-dark { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .glow-blue { box-shadow: 0 0 20px rgba(37, 99, 235, 0.4); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <div className="bg-slate-950 text-slate-100 min-h-screen font-body pb-20">
        
        {/* NAV */}
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/80 border-b border-slate-800">
          <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
            <button onClick={() => router.push('/')} className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white font-headline">Royal Voyager</span>
            </button>
            <div className="flex items-center gap-6">
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold glow-blue transition-all">Sign In</button>
            </div>
          </div>
        </header>

        {/* ─── FIG 2: TOP SEARCH HUB ─── */}
        <section className="relative z-40 pt-10 px-8 max-w-5xl mx-auto">
          <div className="glass-dark bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl p-2 flex items-center gap-1">
            
            {/* Origin */}
            <div ref={sourceRef} className="relative flex-1">
              <button 
                onClick={() => setIsSourceOpen(!isSourceOpen)}
                className="w-full text-left px-6 py-3 hover:bg-slate-800/60 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-400 transition-colors">location_on</span>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-0.5">Origin</span>
                    <span className="block font-semibold text-sm truncate">{searchSource}</span>
                  </div>
                </div>
              </button>
              {isSourceOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 glass-dark bg-slate-900 rounded-xl border border-slate-700 shadow-2xl p-3 z-50">
                  {['Any Port', ...filters.ports].map(p => (
                    <button key={p} onClick={() => { setSearchSource(p); setIsSourceOpen(false); }} className="block w-full text-left px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm">
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-10 bg-slate-800" />

            {/* Destination */}
            <div ref={destRef} className="relative flex-1">
              <button 
                onClick={() => setIsDestOpen(!isDestOpen)}
                className="w-full text-left px-6 py-3 hover:bg-slate-800/60 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-400 transition-colors">explore</span>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-0.5">Destination</span>
                    <span className="block font-semibold text-sm truncate">{searchDest}</span>
                  </div>
                </div>
              </button>
              {isDestOpen && (
                <div className="absolute top-full left-0 mt-2 w-96 glass-dark bg-slate-900 rounded-xl border border-slate-700 shadow-2xl p-5 z-50 grid grid-cols-2 gap-2">
                   {filters.regions.reduce((acc, reg) => [...acc, ...reg.items], [] as string[]).slice(0, 10).map(d => (
                    <button key={d} onClick={() => { setSearchDest(d); setIsDestOpen(false); }} className="text-left px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-xs truncate">
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-10 bg-slate-800" />

            {/* Date */}
            <div className="flex-1 px-6 py-3 hover:bg-slate-800/60 rounded-xl transition-colors group relative">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-400 transition-colors">calendar_today</span>
                <div className="w-full">
                  <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-0.5">Travel Date</span>
                  <input 
                    type="date" 
                    value={searchDate} 
                    onChange={e => setSearchDate(e.target.value)}
                    className="bg-transparent border-none text-white font-semibold text-sm focus:outline-none w-full [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSearchTrigger}
              className="ml-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xl">search</span>
              Search
            </button>
          </div>
        </section>

        {/* ─── DATE WEEK PICKER ─── */}
        <section className="mt-12 max-w-5xl mx-auto px-8">
          <div className="flex items-center gap-4 bg-slate-900/40 border-y border-slate-800 py-4 no-scrollbar overflow-x-auto">
             <button className="material-symbols-outlined text-slate-500 hover:text-white transition-colors">chevron_left</button>
             <div className="flex-1 flex justify-center gap-8">
                {weekDays.map((d, i) => {
                  const isActive = searchDate === d.toISOString().split('T')[0];
                  return (
                    <button 
                      key={i}
                      onClick={() => { setSearchDate(d.toISOString().split('T')[0]); handleSearchTrigger(); }}
                      className={`flex flex-col items-center min-w-[70px] py-2 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white glow-blue' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-sm font-extrabold">{d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                    </button>
                  );
                })}
             </div>
             <button className="material-symbols-outlined text-slate-500 hover:text-white transition-colors">chevron_right</button>
          </div>
        </section>

        <main className="max-w-5xl mx-auto px-8 mt-12 flex flex-col gap-10">
          
          {/* Status Message */}
          {cruises.length === 0 && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm font-medium">No cruises on {searchDate ? new Date(searchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'today'}</p>
              {recommendations.length > 0 && (
                <h2 className="text-3xl font-extrabold flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  Next available on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{new Date(recommendations[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                  <div className="h-px flex-1 bg-slate-800 ml-4" />
                  <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">{recommendations.length} found</span>
                </h2>
              )}
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
              <input 
                placeholder="Filter by voyage name..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex items-center gap-3">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sort by</span>
               <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 focus:outline-none">
                 <option>Lowest Price</option>
                 <option>Earliest Date</option>
               </select>
            </div>
          </div>

          {/* RESULTS LIST */}
          <div className="flex flex-col gap-8">
            {(cruises.length > 0 ? cruises : recommendations).map((cruise, idx) => (
              <RecommendationCard 
                key={cruise.id} 
                cruise={cruise} 
                isNextAvailable={cruises.length === 0 && idx === 0} 
              />
            ))}

            {cruises.length === 0 && recommendations.length === 0 && (
               <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl">
                 <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">sailing</span>
                 <p className="text-slate-400 font-bold">No upcoming voyages found for this port.</p>
               </div>
            )}
          </div>

        </main>
      </div>
    </>
  );
}

function RecommendationCard({ cruise, isNextAvailable }: { cruise: any, isNextAvailable?: boolean }) {
  const router = useRouter();
  const setCruise = useBookingStore((state: any) => state.setCruise);

  // Calculate rooms left
  const totalRooms = cruise.rooms?.reduce((acc: number, r: any) => acc + r.availableRooms, 0) || 0;
  const maxRooms = cruise.rooms?.reduce((acc: number, r: any) => acc + r.totalRooms, 0) || 0;

  return (
    <div className="group flex flex-col md:flex-row bg-slate-900/80 border border-slate-800/50 rounded-3xl overflow-hidden hover:border-slate-700 transition-all shadow-xl hover:shadow-2xl">
      
      {/* Image Section */}
      <div className="relative md:w-[380px] h-64 md:h-auto overflow-hidden">
        <img 
          src={cruise.imageUrl || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=1000'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={cruise.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-5 left-5 flex flex-col gap-2">
          <div className="bg-slate-950/80 text-white text-[10px] font-black px-3 py-1.5 rounded-md tracking-widest uppercase border border-white/20">ECONOMY</div>
          {isNextAvailable && (
             <div className="bg-amber-500/90 text-slate-950 text-[10px] font-black px-3 py-1.5 rounded-md tracking-widest uppercase">NEXT AVAILABLE</div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-black text-white mb-3">{cruise.name}: {cruise.source} to {cruise.destination}</h3>
            <div className="flex items-center gap-2">
              <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-lg text-xs font-bold">{cruise.source}</span>
              <span className="material-symbols-outlined text-slate-600 text-sm">arrow_forward</span>
              <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-lg text-xs font-bold">{cruise.destination}</span>
            </div>
          </div>
        </div>

        {/* Intermediate Stops */}
        <div className="flex items-center gap-2 mb-6 text-emerald-400 bg-emerald-500/5 self-start px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <span className="material-symbols-outlined text-sm">anchor</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Intermediate Stops: Mangalore, Kolkata, Lakshadweep</span>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 border-t border-slate-800 pt-6">
          <div className="flex items-center gap-3">
             <span className="material-symbols-outlined text-blue-500">calendar_today</span>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departs</p>
               <p className="text-sm font-bold text-slate-200">{new Date(cruise.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="material-symbols-outlined text-blue-500">schedule</span>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duration</p>
               <p className="text-sm font-bold text-slate-200">{cruise.duration} Nights</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="material-symbols-outlined text-blue-500">group</span>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Availability</p>
               <p className="text-sm font-bold text-slate-200">{totalRooms} / {maxRooms} Rooms Left</p>
             </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
           <div>
             <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Starting From</p>
             <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white">₹{cruise.basePrice.toLocaleString()}</span>
                <span className="bg-blue-600/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20">AI Live Pricing</span>
             </div>
           </div>
           <button 
             onClick={() => { setCruise(cruise.id); router.push(`/checkout?cruiseId=${cruise.id}`); }}
             className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl font-bold glow-blue shadow-lg hover:scale-105 active:scale-95 transition-all"
           >
             Book Now
           </button>
        </div>
      </div>
    </div>
  );
}

