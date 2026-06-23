"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import LoginModal from '@/components/LoginModal';

export default function HomePage({ filters, featuredCruises }: { 
  filters: { ports: string[], regions: { region: string, items: string[] }[] },
  featuredCruises: any[]
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [isDatesOpen, setIsDatesOpen] = useState(false);
  const [isPortsOpen, setIsPortsOpen] = useState(false);
  const [selectedDest, setSelectedDest] = useState('Where to wander?');
  const [selectedDate, setSelectedDate] = useState('Any Date');
  const [selectedPort, setSelectedPort] = useState('Any Port');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const datesRef = useRef<HTMLDivElement>(null);
  const portsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datesRef.current && !datesRef.current.contains(e.target as Node)) {
        setIsDatesOpen(false);
      }
      if (portsRef.current && !portsRef.current.contains(e.target as Node)) {
        setIsPortsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const user = session?.user as any;

  return (
    <>
      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        .glass-dark {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .hero-text-shadow {
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
        }
        .glow-blue {
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.45), 0 4px 16px rgba(0,0,0,0.4);
        }
        .glow-blue:hover {
          box-shadow: 0 0 32px rgba(37, 99, 235, 0.65), 0 4px 20px rgba(0,0,0,0.5);
        }
        .card-glow:hover {
          box-shadow: 0 0 0 1px rgba(37,99,235,0.25), 0 20px 60px rgba(0,0,0,0.5);
        }
        .segment-separator {
          width: 1px;
          height: 40px;
          background: rgba(148,163,184,0.2);
          flex-shrink: 0;
        }
        @keyframes fadeInScale { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .animate-dropdown { animation: fadeInScale 0.15s ease-out forwards; }
      `}} />

      <div className="bg-slate-950 font-body text-slate-100 min-h-screen">

        {/* ─── TOP NAV ─── */}
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/80 border-b border-slate-800">
          <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white">Royal Voyager</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <button className="text-blue-400 font-bold border-b-2 border-blue-500 pb-1 transition-colors" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Cruises</button>
              <button className="text-slate-400 hover:text-slate-200 transition-colors font-medium" onClick={() => router.push('/search')}>Ships</button>
              <button className="text-slate-400 hover:text-slate-200 transition-colors font-medium" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Destinations</button>
              <button className="text-slate-400 hover:text-slate-200 transition-colors font-medium" onClick={() => router.push('/search')}>Deals</button>
            </nav>
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex items-center gap-4 text-slate-400">
                <button className="hover:text-white transition-colors" onClick={() => router.push('/search')}>
                  <span className="material-symbols-outlined">search</span>
                </button>
              </div>

              {status === 'authenticated' ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="bg-blue-600/20 border border-blue-500/30 hover:border-blue-400/60 hover:bg-blue-600/30 text-blue-300 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base" style={{fontVariationSettings:"'FILL' 1"}}>account_circle</span>
                    <span className="text-sm font-bold truncate max-w-[120px]">Hi, {user?.name?.split(' ')[0]}</span>
                    <span className="material-symbols-outlined text-xs transition-transform duration-200" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 glass-dark bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-2 z-[60] animate-dropdown">
                      <div className="px-4 py-3 border-b border-slate-800 mb-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account</p>
                        <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                      </div>
                      
                      <button 
                        onClick={() => { router.push(user.role === 'admin' ? '/admin' : '/dashboard'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 rounded-xl transition-all text-sm font-semibold text-slate-300 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-base">{user.role === 'admin' ? 'dashboard_customize' : 'dashboard'}</span>
                        {user.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
                      </button>

                      <button 
                        onClick={() => { router.push('/dashboard'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 rounded-xl transition-all text-sm font-semibold text-slate-300 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-base">confirmation_number</span>
                        My Bookings
                      </button>

                      <div className="h-px bg-slate-800 my-1 mx-2" />
                      
                      <button 
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 rounded-xl transition-all text-sm font-semibold text-red-400"
                      >
                        <span className="material-symbols-outlined text-base">logout</span>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold glow-blue active:scale-95 transition-all duration-200"
                  onClick={() => setIsLoginOpen(true)}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        <main>
          {/* ─── CINEMATIC HERO ─── */}
          <section className="relative h-[820px] w-full overflow-hidden">
            <img
              alt="Royal Voyager Luxury Cruise Ship"
              className="absolute inset-0 w-full h-full object-cover scale-105"
              src="https://images.unsplash.com/photo-1599640842225-85d111c60e6b?q=80&w=2000"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/50 to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 via-transparent to-transparent" />

            <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase mb-8 glass-dark">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                2026 Collection Now Available
              </div>
              <h1 className="font-headline text-5xl md:text-8xl font-extrabold text-white hero-text-shadow max-w-5xl leading-[1.05] tracking-tight">
                Seek Your Next<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Great Adventure
                </span>
              </h1>
              <p className="mt-6 text-xl md:text-2xl text-slate-300 font-medium hero-text-shadow max-w-2xl">
                The world's most exclusive voyages, curated for the discerning traveller.
              </p>
            </div>
          </section>

          {/* ─── FLOATING SEARCH HUB ─── */}
          <section className="relative z-40 -mt-10 px-4 max-w-5xl mx-auto">
            <div className="glass-dark bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-2 flex items-center">

              <div ref={portsRef} className="flex-1 px-6 py-3 cursor-pointer hover:bg-slate-800/60 rounded-xl transition-colors relative" onClick={() => { setIsPortsOpen(v => !v); setIsDatesOpen(false); }}>
                <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-0.5">Departure Port</span>
                <span className={`block font-semibold text-sm ${selectedPort === 'Any Port' ? 'text-slate-400' : 'text-white'}`}>{selectedPort}</span>
                {isPortsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 glass-dark bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-3 z-50 max-h-80 overflow-y-auto">
                    {['Any Port', ...filters.ports].map(port => (
                      <button
                        key={port}
                        onClick={(e) => { e.stopPropagation(); setSelectedPort(port); setIsPortsOpen(false); }}
                        className={`block w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                          selectedPort === port
                            ? 'bg-blue-600/20 text-blue-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {selectedPort === port && <span className="mr-1.5">✓</span>}{port}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="segment-separator" />

              <div className="flex-1 px-6 py-3 cursor-pointer group hover:bg-slate-800/60 rounded-xl transition-colors relative">
                <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-0.5">Destinations</span>
                <span className={`block font-semibold text-sm ${selectedDest === 'Where to wander?' ? 'text-slate-400' : 'text-white'}`}>{selectedDest}</span>
                <div className="absolute top-full left-0 mt-2 w-[700px] glass-dark bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-7 hidden group-hover:block before:content-[''] before:absolute before:-top-4 before:left-0 before:w-full before:h-4">
                  <div className="grid grid-cols-4 gap-6">
                    {filters.regions.map(({ region, items }) => (
                      <div key={region}>
                        <h4 className="text-blue-400 font-bold mb-4 text-xs uppercase tracking-widest">{region}</h4>
                        <ul className="space-y-1">
                          {items.map(item => (
                            <li key={item}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDest(item); }}
                                className={`block w-full text-left p-2 font-medium rounded-lg transition-all text-sm ${
                                  selectedDest === item
                                    ? 'bg-blue-600/20 text-blue-300 font-bold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                {selectedDest === item && <span className="mr-1.5">✓</span>}{item}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="segment-separator" />

              <div className="flex-1 px-6 py-3 cursor-pointer hover:bg-slate-800/60 rounded-xl transition-colors relative group">
                <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-0.5">Dates</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={selectedDate.includes('-') ? selectedDate : ''}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none text-white font-semibold text-sm focus:outline-none cursor-pointer w-full [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                id="main-search-btn"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (selectedDest !== 'Where to wander?') params.set('dest', selectedDest);
                  if (selectedDate !== 'Any Date' && selectedDate !== 'Anytime') params.set('date', selectedDate);
                  if (selectedPort !== 'Any Port') params.set('source', selectedPort);
                  router.push(`/search?${params.toString()}`);
                }}
                className="ml-2 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center glow-blue active:scale-90 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-2xl">search</span>
              </button>

            </div>
          </section>

          {/* Featured Sections (Shortened for brevity) */}
          <section className="py-24 px-8 max-w-screen-2xl mx-auto">
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
              <div>
                <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">Handpicked for You</p>
                <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">Featured Voyages</h2>
              </div>
              <button onClick={() => router.push('/search')} className="group flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-base transition-all">
                View All Expeditions
                <span className="material-symbols-outlined group-hover:translate-x-1.5 transition-transform">arrow_forward</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredCruises.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => router.push(`/cruise/${c.id}`)}
                      className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden card-glow transition-all duration-500"
                    >
                        <div className="relative h-64 overflow-hidden">
                            <img 
                              src={c.imageUrl || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=1000'} 
                              alt={c.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                            <div className="absolute top-4 left-4 glass-dark bg-blue-600/20 border border-blue-500/40 text-blue-200 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                              {c.duration} Nights
                            </div>
                        </div>
                        <div className="p-8">
                            <h3 className="text-xl font-extrabold text-white mb-1">{c.name}</h3>
                            <div className="flex items-center justify-between mt-6">
                                <span className="text-2xl font-black text-white">₹{c.basePrice.toLocaleString('en-IN')}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); router.push(`/checkout?cruiseId=${c.id}`); }}
                                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all glow-blue"
                                >
                                  Book Now
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-slate-800 bg-slate-900/50 py-20 px-8">
          <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-6">
                <span className="material-symbols-outlined text-blue-500 text-3xl">anchor</span>
                <span className="text-2xl font-black tracking-tight text-white">Royal Voyager</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">Defining the next generation of luxury maritime exploration. Curated voyages for the global elite.</p>
            </div>
            {['Cruises', 'Services', 'Legal', 'Connect'].map(cat => (
              <div key={cat}>
                <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">{cat}</h4>
                <ul className="space-y-4 text-slate-500 text-sm font-medium">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Press Room</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Careers</a></li>
                </ul>
              </div>
            ))}
          </div>
        </footer>

      </div>
    </>
  );
}
