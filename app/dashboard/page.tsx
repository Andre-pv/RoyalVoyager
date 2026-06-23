'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Booking {
  id: string;
  status: string;
  totalPrice: number;
  roomNumber: string | null;
  createdAt: string;
  cruise: { id: string; name: string; source: string; destination: string; date: string; endDate: string; duration: number; };
  notes: string | null;
  roomBookings: { room: { type: string; deckNumber: number; } }[];
  restaurantBookings: { restaurant: { mealType: string; slotTime: string; slotDate: string; } }[];
  showBookings: { show: { name: string; time: string; showDate: string; } }[];
  gameBookings: { game: { name: string; time: string; gameDate: string; } }[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  pending:   'bg-amber-500/20  text-amber-300  border border-amber-500/30',
  cancelled: 'bg-red-500/20    text-red-400    border border-red-500/30',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const getRoomDisplays = (b: Booking) => {
  if (b.roomNumber) {
    return b.roomNumber.split(',').map((roomNum, idx) => {
      const rb = b.roomBookings[Math.min(idx, b.roomBookings.length - 1)] || b.roomBookings[0];
      return `Cabin ${roomNum.trim()} (Deck ${rb?.room?.deckNumber || 'N/A'})`;
    }).join(', ');
  }
  return b.roomBookings.map(rb => `${rb.room.type} (Deck ${rb.room.deckNumber})`).join(', ') || 'Standard Room';
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // PDF Ticket State
  const [printingBooking, setPrintingBooking] = useState<Booking | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const fetchBookings = () => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then(d => { setBookings(d.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/'); return; }
    if (status !== 'authenticated') return;
    fetchBookings();
  }, [status, router]);

  // Effect to generate PDF once the hidden ticket is mounted
  useEffect(() => {
    if (printingBooking && ticketRef.current) {
        // give it a tiny delay to ensure fonts/layout are flushed
        const timer = setTimeout(() => {
            generatePDF();
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [printingBooking]);

  const generatePDF = async () => {
      try {
          const element = ticketRef.current;
          if (!element) return;
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#020617' });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'px',
              format: [canvas.width / 2, canvas.height / 2]
          });
          
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
          pdf.save(`Royal_Voyager_Ticket_${printingBooking!.id.slice(-6)}.pdf`);
          
          if (toastIdRef.current) {
              toast.success('Ticket downloaded successfully!', { id: toastIdRef.current });
          } else {
              toast.success('Ticket downloaded successfully!');
          }
      } catch (err) {
          if (toastIdRef.current) {
              toast.error('Failed to generate ticket.', { id: toastIdRef.current });
          } else {
              toast.error('Failed to generate ticket.');
          }
      } finally {
          setPrintingBooking(null);
          toastIdRef.current = null;
      }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This action is irreversible and all associated activities will be released.')) return;
    
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: 'cancelled' })
      });
      if (res.ok) {
        toast.success('Booking cancelled successfully');
        fetchBookings();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to cancel booking');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const user = session?.user as any;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const totalSpend = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.totalPrice, 0);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
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
        .fade-slide { animation:fadeSlide .3s ease both; }
      `}} />

      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        {/* NAV */}
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/85 border-b border-slate-800">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white">Royal Voyager</span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/search')} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all glow-blue">
                <span className="material-symbols-outlined text-base">add</span>
                Book Another
              </button>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-semibold text-sm transition-all">
                <span className="material-symbols-outlined text-base">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-6 py-10">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl glow-blue flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Welcome back</p>
              <h1 className="text-3xl font-extrabold text-white mt-0.5">{user?.name || 'Guest'}</h1>
              <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Active Bookings', value: confirmedCount, icon: 'confirmation_number', color: 'text-blue-400' },
              { label: 'Total Voyages',   value: bookings.length, icon: 'directions_boat', color: 'text-purple-400' },
              { label: 'Total Spent',     value: fmt(totalSpend), icon: 'payments', color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{s.label}</span>
                </div>
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Bookings */}
          <h2 className="text-xl font-extrabold text-white mb-5">Your Bookings</h2>

          {bookings.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl">
              <span className="material-symbols-outlined text-slate-600 text-6xl">directions_boat</span>
              <p className="text-slate-400 text-xl font-bold mt-4">No voyages yet</p>
              <p className="text-slate-600 text-sm mt-2 mb-6">Your bookings will appear here once you book a cruise.</p>
              <button onClick={() => router.push('/search')} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all glow-blue">
                <span className="material-symbols-outlined text-base">search</span> Browse Cruises
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {bookings.map(b => {
                const isExpanded = expanded === b.id;
                const roomDisplays = getRoomDisplays(b);

                return (
                  <div key={b.id} className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all">
                    {/* Card Header */}
                    <div className="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4" onClick={() => setExpanded(isExpanded ? null : b.id)}>
                      <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-400 text-2xl">directions_boat</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-white font-extrabold text-base truncate">{b.cruise.name}</h3>
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] || STATUS_COLORS.pending}`}>{b.status}</span>
                        </div>
                        <p className="text-slate-400 text-sm">{b.cruise.source} → {b.cruise.destination}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span>{fmtDate(b.cruise.date)} – {fmtDate(b.cruise.endDate)}</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">king_bed</span>{roomDisplays}</span>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
                        <p className="text-xl font-extrabold text-white">{fmt(b.totalPrice)}</p>
                        <span className="text-slate-500 text-xs">{fmtDate(b.createdAt)}</span>
                        <span className="material-symbols-outlined text-slate-500 text-xl transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                      </div>
                    </div>

                    {/* Expanded Itinerary */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 px-6 py-6 fade-slide">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-blue-400 text-base">theater_comedy</span>Shows Booked</p>
                            {b.showBookings.length === 0 ? <p className="text-slate-600 text-sm">None booked</p> : b.showBookings.map((s, i) => <div key={i} className="text-sm text-slate-300 mb-1.5"><span className="font-semibold">{s.show.name}</span><span className="text-slate-500 text-xs block">{fmtDate(s.show.showDate)} at {s.show.time}</span></div>)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-purple-400 text-base">sports_esports</span>Activities</p>
                            {b.gameBookings.length === 0 ? <p className="text-slate-600 text-sm">None booked</p> : b.gameBookings.map((g, i) => <div key={i} className="text-sm text-slate-300 mb-1.5"><span className="font-semibold">{g.game.name}</span><span className="text-slate-500 text-xs block">{fmtDate(g.game.gameDate)} at {g.game.time}</span></div>)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-amber-400 text-base">restaurant</span>Dining</p>
                            {b.restaurantBookings.length === 0 ? <p className="text-slate-600 text-sm">None booked</p> : b.restaurantBookings.map((r, i) => <div key={i} className="text-sm text-slate-300 mb-1.5"><span className="font-semibold capitalize">{r.restaurant.mealType}</span><span className="text-slate-500 text-xs block">{fmtDate(r.restaurant.slotDate)} at {r.restaurant.slotTime}</span></div>)}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {b.status === 'confirmed' && (
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
                            <button onClick={() => router.push(`/voyage/${b.id}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all glow-blue">
                              <span className="material-symbols-outlined text-base" style={{fontVariationSettings:"'FILL' 1"}}>auto_fix_high</span> Personalise Voyage
                            </button>
                            <button onClick={() => { 
                              setPrintingBooking(b); 
                              const tid = toast.loading('Generating Ticket...'); 
                              toastIdRef.current = tid;
                            }} disabled={printingBooking?.id === b.id} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-semibold text-sm transition-all disabled:opacity-50">
                              <span className="material-symbols-outlined text-base">download</span> Download Ticket
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.id); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-900/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 font-bold text-sm transition-all">
                              <span className="material-symbols-outlined text-base">cancel</span> Cancel Booking
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* HIDDEN TICKET FOR PDF RENDERING */}
      {printingBooking && (
        <div className="fixed overflow-hidden pointer-events-none" style={{ left: '-9999px', top: 0, width: '800px', backgroundColor: '#020617' }}>
            <div ref={ticketRef} className="bg-slate-950 p-10 font-sans text-slate-100 border-4 border-blue-900/30 rounded-3xl" style={{ width: '800px', margin: '0 auto' }}>
                <div className="flex justify-between items-start border-b border-slate-800 pb-8 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-4xl">anchor</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Royal Voyager</h1>
                            <p className="text-blue-400 font-bold tracking-widest text-sm">Official Boarding Pass</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Booking ID</p>
                        <p className="text-white font-mono text-lg">{printingBooking.id.toUpperCase()}</p>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8">
                    <h2 className="text-2xl font-black text-white mb-2">{printingBooking.cruise.name}</h2>
                    <p className="text-slate-400 font-medium mb-6">{printingBooking.cruise.source} to {printingBooking.cruise.destination}</p>
                    
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Departure</p>
                            <p className="text-white font-bold">{fmtDate(printingBooking.cruise.date)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Return</p>
                            <p className="text-white font-bold">{fmtDate(printingBooking.cruise.endDate)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Stateroom</p>
                            <p className="text-white font-bold text-lg text-blue-400">
                                {getRoomDisplays(printingBooking)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Passenger Information</p>
                        <p className="text-white font-bold text-xl mb-1">{user?.name || 'Guest Passenger'}</p>
                        <p className="text-slate-400 text-sm mb-2">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
                            <span className="material-symbols-outlined text-blue-400 text-sm">group</span>
                            <span className="text-slate-300 text-sm font-bold uppercase tracking-widest">
                                {printingBooking.notes?.includes('Guests:') ? printingBooking.notes : 'Guests: 1'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-blue-950/40 border border-blue-900/50 rounded-3xl p-8 flex flex-col justify-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Transaction Total</p>
                        <p className="text-blue-300 font-black text-4xl">{fmt(printingBooking.totalPrice)}</p>
                        <p className="text-emerald-400 text-xs font-bold mt-2">✓ PAYMENT CONFIRMED</p>
                    </div>
                </div>

                <div className="text-center mt-6">
                    <p className="text-slate-600 text-[10px] font-mono tracking-widest">THIS DOCUMENT IS YOUR OFFICIAL PROOF OF PURCHASE</p>
                    <p className="text-slate-600 text-[10px] font-mono tracking-widest mt-1">PLEASE PRESENT AT EMBARKATION TERMINAL</p>
                </div>
            </div>
        </div>
      )}
    </>
  );
}
