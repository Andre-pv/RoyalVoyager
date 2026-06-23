'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StatCard { label: string; value: string | number; icon: string; color: string; bg: string; }
interface Cruise { id: string; name: string; source: string; destination: string; date: string; duration: number; basePrice: number; _count: { bookings: number; rooms: number }; region?: { name: string }; }
interface AdminBooking { id: string; totalPrice: number; status: string; roomNumber: string | null; createdAt: string; user: { firstName: string; lastName: string; email: string; }; cruise: { name: string; date: string; }; roomBookings: { room: { type: string; deckNumber: number } }[]; }
interface Show { id: string; name: string; time: string; showDate: string; capacity: number; bookedCount: number; cruise: { name: string }; showBookings: { user: { firstName: string; lastName: string; email: string } }[]; }
interface Game { id: string; name: string; time: string; gameDate: string; maxPlayers: number; currentPlayers: number; cruise: { name: string }; gameBookings: { user: { firstName: string; lastName: string; email: string } }[]; }
interface Restaurant { id: string; mealType: string; slotTime: string; slotDate: string; capacity: number; bookedCount: number; cruise: { name: string }; bookings: { booking: { user: { firstName: string; lastName: string; email: string } } }[]; }
interface WaitlistEntry { id: string; eventType: string; position: number; user: { firstName: string; lastName: string; email: string }; show?: { name: string }; game?: { name: string }; restaurant?: { mealType: string; slotTime: string }; }

const fmt   = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  pending:   'bg-amber-500/20  text-amber-300  border-amber-500/30',
  cancelled: 'bg-red-500/20    text-red-400    border-red-500/30',
};

const TABS = ['Overview', 'Cruises', 'Bookings', 'Shows', 'Games', 'Restaurants', 'Waitlist'] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  // Data
  const [stats,       setStats]       = useState<any>(null);
  const [cruises,     setCruises]     = useState<Cruise[]>([]);
  const [bookings,    setBookings]    = useState<AdminBooking[]>([]);
  const [shows,       setShows]       = useState<Show[]>([]);
  const [games,       setGames]       = useState<Game[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [waitlist,    setWaitlist]    = useState<WaitlistEntry[]>([]);
  const [loading,     setLoading]     = useState(true);

  // UI state
  const [showExpanded, setShowExpanded] = useState<string | null>(null);
  const [gameExpanded, setGameExpanded] = useState<string | null>(null);
  const [restExpanded, setRestExpanded] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<string>('all');
  const [isAddingCruise, setIsAddingCruise] = useState(false);
  const [newCruise, setNewCruise] = useState({
    name: '', source: '', destination: '', date: '', duration: '', basePrice: '', ship: 'MV Ocean Star'
  });

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/'); return; }
    if (status !== 'authenticated') return;
    if (user?.role !== 'admin') { router.replace('/'); return; }
    loadAll();
  }, [status]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, b, sh, g, r, w] = await Promise.all([
        fetch('/api/admin/stats').then(x => x.json()),
        fetch('/api/admin/cruises').then(x => x.json()),
        fetch('/api/admin/bookings').then(x => x.json()),
        fetch('/api/admin/shows').then(x => x.json()),
        fetch('/api/admin/games').then(x => x.json()),
        fetch('/api/admin/restaurants').then(x => x.json()),
        fetch('/api/admin/waitlist').then(x => x.json()),
      ]);
      setStats(s);
      setCruises(c.cruises || []);
      setBookings(b.bookings || []);
      setShows(sh.shows || []);
      setGames(g.games || []);
      setRestaurants(r.restaurants || []);
      setWaitlist(w.entries || []);
    } catch { toast.error('Failed to load dashboard data'); }
    setLoading(false);
  }, []);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, status: newStatus }),
    });
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      toast.success('Booking status updated');
    } else toast.error('Failed to update status');
  };

  const deleteCruise = async (cruiseId: string) => {
    if (!confirm('Delete this cruise and all associated data?')) return;
    const res = await fetch('/api/admin/cruises', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cruiseId }),
    });
    if (res.ok) { setCruises(prev => prev.filter(c => c.id !== cruiseId)); toast.success('Cruise deleted'); }
    else toast.error('Failed to delete cruise');
  };

  const handleAddCruise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/cruises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCruise),
      });
      if (res.ok) {
        const data = await res.json();
        setCruises(prev => [...prev, { ...data.cruise, _count: { bookings: 0, rooms: 4 } }]);
        setIsAddingCruise(false);
        setNewCruise({ name: '', source: '', destination: '', date: '', duration: '', basePrice: '', ship: 'MV Ocean Star' });
        toast.success('Cruise created successfully');
      } else toast.error('Failed to create cruise');
    } catch { toast.error('Error creating cruise'); }
  };

  const deleteWaitlist = async (waitlistId: string) => {
    const res = await fetch('/api/admin/waitlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waitlistId }),
    });
    if (res.ok) { setWaitlist(prev => prev.filter(e => e.id !== waitlistId)); toast.success('Entry removed'); }
    else toast.error('Failed to remove entry');
  };

  const filteredBookings = bookingFilter === 'all' ? bookings : bookings.filter(b => b.status === bookingFilter);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <p className="text-slate-400">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; display:inline-block;vertical-align:middle; }
        .glass-dark { backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }
        .glow-blue { box-shadow:0 0 20px rgba(37,99,235,.4),0 4px 16px rgba(0,0,0,.4); }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-slide { animation:fadeSlide .25s ease both; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0f172a; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:4px; }
      `}} />

      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/85 border-b border-slate-800">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-2.5 hover:opacity-80">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white">Royal Voyager</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-600/30">Admin</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-slate-500 text-sm font-medium">{user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-semibold text-sm transition-all"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-6 py-8">

          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Manage cruise operations, bookings, and guest experiences.</p>
          </div>

          {/* ── TABS ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-1.5 mb-8 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap
                  ${activeTab === tab ? 'bg-blue-600 text-white glow-blue' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="fade-slide" key={activeTab}>

            {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
            {activeTab === 'Overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: 'Total Cruises',    value: stats?.totalCruises   ?? 0,              icon: 'directions_boat', color: 'text-blue-400',    bg: 'from-blue-600/10 to-blue-600/5'    },
                    { label: 'Total Bookings',   value: stats?.totalBookings  ?? 0,              icon: 'confirmation_number', color: 'text-purple-400', bg: 'from-purple-600/10 to-purple-600/5' },
                    { label: 'Active Waitlists', value: stats?.totalWaitlists ?? 0,              icon: 'people_alt',      color: 'text-amber-400',   bg: 'from-amber-600/10 to-amber-600/5'  },
                    { label: 'Total Revenue',    value: fmt(stats?.revenue    ?? 0),             icon: 'payments',        color: 'text-emerald-400', bg: 'from-emerald-600/10 to-emerald-600/5'  },
                  ].map(card => (
                    <div key={card.label} className={`bg-gradient-to-br ${card.bg} border border-slate-800 rounded-2xl p-6`}>
                      <div className="flex items-start justify-between mb-4">
                        <span className={`material-symbols-outlined text-2xl ${card.color}`}>{card.icon}</span>
                      </div>
                      <p className={`text-2xl sm:text-3xl font-extrabold ${card.color}`}>{card.value}</p>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Bookings */}
                <div>
                  <h2 className="text-lg font-extrabold text-white mb-4">Recent Bookings</h2>
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Guest</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cruise</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cabin</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.slice(0, 10).map(b => (
                            <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                              <td className="px-5 py-4">
                                <p className="text-white font-semibold">{b.user.firstName} {b.user.lastName}</p>
                                <p className="text-slate-500 text-xs">{b.user.email}</p>
                              </td>
                              <td className="px-5 py-4 text-slate-300">{b.cruise.name}</td>
                              <td className="px-5 py-4 text-slate-400">{b.roomNumber ? `Cabin ${b.roomNumber}` : b.roomBookings[0]?.room?.type || '—'}</td>
                              <td className="px-5 py-4 text-white font-bold">{fmt(b.totalPrice)}</td>
                              <td className="px-5 py-4">
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_COLORS[b.status]}`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ CRUISES ══════════════════════════════════════════════ */}
            {activeTab === 'Cruises' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-extrabold text-white">All Cruises <span className="text-slate-600 font-normal text-base ml-2">({cruises.length})</span></h2>
                  <button
                    onClick={() => setIsAddingCruise(!isAddingCruise)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg
                      ${isAddingCruise ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white glow-blue'}`}
                  >
                    <span className="material-symbols-outlined">{isAddingCruise ? 'close' : 'add'}</span>
                    {isAddingCruise ? 'Cancel' : 'Add Cruise'}
                  </button>
                </div>

                {isAddingCruise && (
                  <form onSubmit={handleAddCruise} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 fade-slide shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                    <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-3">
                      <span className="material-symbols-outlined text-blue-500">directions_boat</span>
                      New Cruise
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cruise Name</label>
                        <input
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. Royal Emerald"
                          value={newCruise.name}
                          onChange={e => setNewCruise({ ...newCruise, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">From (Port)</label>
                        <input
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. Kochi"
                          value={newCruise.source}
                          onChange={e => setNewCruise({ ...newCruise, source: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">To (Destination)</label>
                        <input
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. Kolkata"
                          value={newCruise.destination}
                          onChange={e => setNewCruise({ ...newCruise, destination: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Departure Date</label>
                        <input
                          required
                          type="date"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          value={newCruise.date}
                          onChange={e => setNewCruise({ ...newCruise, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Duration (nights)</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. 5"
                          value={newCruise.duration}
                          onChange={e => setNewCruise({ ...newCruise, duration: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Base Price (₹)</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. 15000"
                          value={newCruise.basePrice}
                          onChange={e => setNewCruise({ ...newCruise, basePrice: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ship Name</label>
                        <input
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="MV Ocean Star"
                          value={newCruise.ship}
                          onChange={e => setNewCruise({ ...newCruise, ship: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button
                        type="submit"
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-base glow-blue hover:scale-105 transition-all shadow-xl"
                      >
                        Create Cruise
                      </button>
                    </div>
                  </form>
                )}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-left">
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cruise</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Route</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Departure</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Bookings</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Base Price</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cruises.map(c => (
                          <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <p className="text-white font-semibold">{c.name}</p>
                              {c.region && <p className="text-blue-400/60 text-xs mt-0.5">{c.region.name}</p>}
                            </td>
                            <td className="px-5 py-4 text-slate-400">{c.source} → {c.destination}</td>
                            <td className="px-5 py-4 text-slate-300">{fmtDt(c.date)}</td>
                            <td className="px-5 py-4 text-slate-400">{c.duration}N</td>
                            <td className="px-5 py-4">
                              <span className="text-white font-bold">{c._count.bookings}</span>
                              <span className="text-slate-600 ml-1">bookings</span>
                            </td>
                            <td className="px-5 py-4 text-emerald-400 font-bold">{fmt(c.basePrice)}</td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => deleteCruise(c.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══ BOOKINGS ═════════════════════════════════════════════ */}
            {activeTab === 'Bookings' && (
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <h2 className="text-xl font-extrabold text-white">All Bookings <span className="text-slate-600 font-normal text-base ml-2">({bookings.length})</span></h2>
                  <div className="ml-auto flex items-center gap-2">
                    {['all', 'confirmed', 'pending', 'cancelled'].map(f => (
                      <button
                        key={f}
                        onClick={() => setBookingFilter(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                          ${bookingFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-left">
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Guest</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cruise</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cabin</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Booked On</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                          <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map(b => (
                          <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <p className="text-white font-semibold">{b.user.firstName} {b.user.lastName}</p>
                              <p className="text-slate-500 text-xs">{b.user.email}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-300 max-w-[160px] truncate">{b.cruise.name}</td>
                            <td className="px-5 py-4 text-slate-400">
                              {b.roomNumber ? `Cabin ${b.roomNumber}` : b.roomBookings[0]?.room?.type || '—'}
                              {b.roomBookings[0]?.room?.deckNumber && (
                                <span className="text-slate-600 text-xs ml-1">· D{b.roomBookings[0].room.deckNumber}</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-white font-bold">{fmt(b.totalPrice)}</td>
                            <td className="px-5 py-4 text-slate-500 text-xs">{fmtDt(b.createdAt)}</td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_COLORS[b.status]}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-1">
                                {b.status !== 'confirmed' && (
                                  <button onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                    className="px-2.5 py-1.5 text-xs font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-all">Confirm</button>
                                )}
                                {b.status !== 'cancelled' && (
                                  <button onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                    className="px-2.5 py-1.5 text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all">Cancel</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SHOWS ════════════════════════════════════════════════ */}
            {activeTab === 'Shows' && (
              <div>
                <h2 className="text-xl font-extrabold text-white mb-5">Shows & Entertainment <span className="text-slate-600 font-normal text-base ml-2">({shows.length})</span></h2>
                <div className="flex flex-col gap-4">
                  {shows.map(show => {
                    const isOpen = showExpanded === show.id;
                    const pct = Math.min(100, (show.bookedCount / show.capacity) * 100);
                    return (
                      <div key={show.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-5 cursor-pointer flex flex-wrap gap-4 items-center" onClick={() => setShowExpanded(isOpen ? null : show.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full">Show</span>
                              <p className="text-white font-extrabold truncate">{show.name}</p>
                            </div>
                            <p className="text-slate-500 text-xs">{show.cruise.name} · {fmtDt(show.showDate)} at {show.time}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-white font-bold text-sm">{show.bookedCount}<span className="text-slate-600">/{show.capacity}</span></p>
                              <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-500 transition-transform duration-300 text-xl" style={{transform: isOpen ? 'rotate(180deg)' : 'none'}}>expand_more</span>
                          </div>
                        </div>
                        {isOpen && (
                          <div className="border-t border-slate-800 px-5 py-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Attendees ({show.showBookings.length})</p>
                            {show.showBookings.length === 0
                              ? <p className="text-slate-600 text-sm">No bookings yet</p>
                              : <div className="flex flex-wrap gap-2">
                                  {show.showBookings.map((sb, i) => (
                                    <span key={i} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg">
                                      {sb.user.firstName} {sb.user.lastName}
                                    </span>
                                  ))}
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ GAMES ════════════════════════════════════════════════ */}
            {activeTab === 'Games' && (
              <div>
                <h2 className="text-xl font-extrabold text-white mb-5">Onboard Activities <span className="text-slate-600 font-normal text-base ml-2">({games.length})</span></h2>
                <div className="flex flex-col gap-4">
                  {games.map(game => {
                    const isOpen = gameExpanded === game.id;
                    const pct = Math.min(100, (game.currentPlayers / game.maxPlayers) * 100);
                    return (
                      <div key={game.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-5 cursor-pointer flex flex-wrap gap-4 items-center" onClick={() => setGameExpanded(isOpen ? null : game.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-full">Activity</span>
                              <p className="text-white font-extrabold truncate">{game.name}</p>
                            </div>
                            <p className="text-slate-500 text-xs">{game.cruise.name} · {fmtDt(game.gameDate)} at {game.time}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-white font-bold text-sm">{game.currentPlayers}<span className="text-slate-600">/{game.maxPlayers}</span></p>
                              <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-500 transition-transform duration-300 text-xl" style={{transform: isOpen ? 'rotate(180deg)' : 'none'}}>expand_more</span>
                          </div>
                        </div>
                        {isOpen && (
                          <div className="border-t border-slate-800 px-5 py-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Participants ({game.gameBookings.length})</p>
                            {game.gameBookings.length === 0
                              ? <p className="text-slate-600 text-sm">No participants yet</p>
                              : <div className="flex flex-wrap gap-2">
                                  {game.gameBookings.map((gb, i) => (
                                    <span key={i} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg">
                                      {gb.user.firstName} {gb.user.lastName}
                                    </span>
                                  ))}
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ RESTAURANTS ══════════════════════════════════════════ */}
            {activeTab === 'Restaurants' && (
              <div>
                <h2 className="text-xl font-extrabold text-white mb-5">Dining Slots <span className="text-slate-600 font-normal text-base ml-2">({restaurants.length})</span></h2>
                <div className="flex flex-col gap-4">
                  {restaurants.map(rest => {
                    const isOpen = restExpanded === rest.id;
                    const pct = Math.min(100, (rest.bookedCount / rest.capacity) * 100);
                    const mealColor = rest.mealType === 'breakfast' ? 'text-amber-400' : rest.mealType === 'lunch' ? 'text-orange-400' : 'text-blue-400';
                    const mealIcon = rest.mealType === 'breakfast' ? 'free_breakfast' : rest.mealType === 'lunch' ? 'lunch_dining' : 'dinner_dining';
                    return (
                      <div key={rest.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-5 cursor-pointer flex flex-wrap gap-4 items-center" onClick={() => setRestExpanded(isOpen ? null : rest.id)}>
                          <span className={`material-symbols-outlined text-2xl ${mealColor}`}>{mealIcon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${mealColor} bg-slate-800`}>{rest.mealType}</span>
                              <p className="text-white font-bold">Slot at {rest.slotTime}</p>
                            </div>
                            <p className="text-slate-500 text-xs">{rest.cruise.name} · {fmtDt(rest.slotDate)}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-white font-bold text-sm">{rest.bookedCount}<span className="text-slate-600">/{rest.capacity}</span></p>
                              <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-500 transition-transform duration-300 text-xl" style={{transform: isOpen ? 'rotate(180deg)' : 'none'}}>expand_more</span>
                          </div>
                        </div>
                        {isOpen && (
                          <div className="border-t border-slate-800 px-5 py-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Guests ({rest.bookings.length})</p>
                            {rest.bookings.length === 0
                              ? <p className="text-slate-600 text-sm">No guests booked yet</p>
                              : <div className="flex flex-wrap gap-2">
                                  {rest.bookings.map((rb, i) => (
                                    <span key={i} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg">
                                      {rb.booking.user.firstName} {rb.booking.user.lastName}
                                    </span>
                                  ))}
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ WAITLIST ═════════════════════════════════════════════ */}
            {activeTab === 'Waitlist' && (
              <div>
                <h2 className="text-xl font-extrabold text-white mb-5">Active Waitlists <span className="text-slate-600 font-normal text-base ml-2">({waitlist.length})</span></h2>
                {waitlist.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-2xl">
                    <span className="material-symbols-outlined text-slate-600 text-5xl">people_alt</span>
                    <p className="text-slate-500 mt-3 font-medium">No active waitlist entries</p>
                  </div>
                ) : (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Pos</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Guest</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Event</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waitlist.map(entry => (
                            <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                              <td className="px-5 py-4">
                                <span className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-extrabold text-sm flex items-center justify-center">
                                  #{entry.position}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-white font-semibold">{entry.user.firstName} {entry.user.lastName}</p>
                                <p className="text-slate-500 text-xs">{entry.user.email}</p>
                              </td>
                              <td className="px-5 py-4 text-slate-300">
                                {entry.show?.name || entry.game?.name || `${entry.restaurant?.mealType} at ${entry.restaurant?.slotTime}` || '—'}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border
                                  ${entry.eventType === 'show' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : entry.eventType === 'game' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}
                                >
                                  {entry.eventType}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <button
                                  onClick={() => deleteWaitlist(entry.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
