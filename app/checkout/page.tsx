'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface RoomSlot { number: string; status: 'available' | 'occupied'; }
interface Deck {
  id: string; type: string; deckNumber: number;
  price: number; totalRooms: number; availableRooms: number; slots: RoomSlot[];
}
interface RestaurantSlot {
  id: string; mealType: string; slotTime: string; name: string;
  slotDate: string; capacity: number; bookedCount: number; durationMinutes: number;
}
interface Cruise {
  id: string; name: string; source: string; destination: string;
  date: string; endDate: string; duration: number; basePrice: number; ship?: string;
}

// ─── STEPS ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Party Size',     icon: 'group'       },
  { id: 2, label: 'Room Selection', icon: 'king_bed'    },
  { id: 3, label: 'Preferences',    icon: 'tune'        },
  { id: 4, label: 'Review',         icon: 'fact_check'  },
  { id: 5, label: 'Pay',            icon: 'credit_card' },
];

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'UAE', 'Singapore', 'Japan', 'Other',
];

// ─── Inner Component (uses useSearchParams) ───────────────────────────────────
function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const cruiseId = searchParams.get('cruiseId');

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [cruise, setCruise] = useState<Cruise | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Step 1
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Step 2
  const [selectedRooms, setSelectedRooms] = useState<{ roomId: string; roomNumber: string; type: string; price: number; deckNumber: number }[]>([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  // Step 3 — dining preferences (one per meal type)
  const [selectedRestaurants, setSelectedRestaurants] = useState<Record<string, string>>({});

  // Step 5 — guests (up to 4)
  const [guests, setGuests] = useState([
    { firstName: '', lastName: '', dob: '', citizenship: '' },
    { firstName: '', lastName: '', dob: '', citizenship: '' },
  ]);

  // ── Fetch data ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cruiseId) { router.push('/search'); return; }
    Promise.all([
      fetch(`/api/cruise/${cruiseId}`).then(r => r.json()),
      fetch(`/api/cruise/${cruiseId}/rooms`).then(r => r.json()),
    ]).then(([cruiseData, roomData]) => {
      if (cruiseData.cruise) setCruise(cruiseData.cruise);
      if (roomData.decks) { setDecks(roomData.decks); }
      if (cruiseData.cruise?.restaurants) setRestaurants(cruiseData.cruise.restaurants);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load cruise data'); setLoading(false); });
  }, [cruiseId, router]);

  // Sync guest count to adults
  useEffect(() => {
    setGuests(g => {
      const needed = adults;
      if (needed > g.length) return [...g, ...Array(needed - g.length).fill({ firstName: '', lastName: '', dob: '', citizenship: '' })];
      return g.slice(0, needed);
    });
  }, [adults]);

  // ── Pricing ─────────────────────────────────────────────────────────────
  const pax = adults + children;
  const requiredRooms = Math.ceil(pax / 3);
  const totalRoomPricePerNight = selectedRooms.reduce((acc, r) => acc + r.price, 0);
  const duration = cruise?.duration ?? 1;
  const totalPrice = Math.round(totalRoomPricePerNight * duration);
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const goTo = (step: number) => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentStep(step); };

  // ── Booking ──────────────────────────────────────────────────────────────
  const handleConfirmBooking = useCallback(async () => {
    if (!session?.user) { toast.error('Please sign in to book'); router.push('/'); return; }
    if (selectedRooms.length < requiredRooms) { toast.error(`Please select ${requiredRooms} rooms`); return; }

    setBookingLoading(true);
    try {
      const restaurantIds = Object.entries(selectedRestaurants).flatMap(([mealType, slotTime]) => {
        if (!slotTime) return [];
        return restaurants
          .filter(r => r.mealType === mealType && r.slotTime === slotTime)
          .map(r => r.id);
      });

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cruiseId: cruise?.id,
          rooms: selectedRooms.map(r => ({ roomId: r.roomId, roomNumber: r.roomNumber })),
          restaurantIds,
          totalPrice,
          guestCount: adults + children,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('🎉 Booking confirmed!');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Booking failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  }, [session, cruise, selectedRooms, requiredRooms, selectedRestaurants, totalPrice, router]);

  // ── Grouped restaurants ──────────────────────────────────────────────────
  const groupedRestaurants = restaurants.reduce((acc, r) => {
    if (!acc[r.mealType]) acc[r.mealType] = [];
    acc[r.mealType].push(r);
    return acc;
  }, {} as Record<string, RestaurantSlot[]>);

  // ─── Loading State ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading cruise details...</p>
        </div>
      </div>
    );
  }

  if (!cruise) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-xl">Cruise not found.</p>
          <button onClick={() => router.push('/search')} className="mt-4 text-blue-400 hover:underline">Back to search</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined { font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; display:inline-block;vertical-align:middle; }
        .glass-dark { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .glow-blue { box-shadow: 0 0 20px rgba(37,99,235,.45),0 4px 16px rgba(0,0,0,.4); }
        .glow-blue:hover { box-shadow: 0 0 32px rgba(37,99,235,.65),0 6px 20px rgba(0,0,0,.5); }
        .room-active { box-shadow: 0 0 0 3px rgba(37,99,235,.65),0 8px 24px rgba(37,99,235,.25); }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-slide { animation: fadeSlide .28s ease both; }
        input[type="text"],input[type="date"],select { background:transparent; color:white; }
        input::placeholder { color:#475569; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}} />

      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">

        {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/85 border-b border-slate-800">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white">Royal Voyager</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
              <span className="material-symbols-outlined text-base text-green-400">lock</span>
              Secure Booking · 256-bit SSL
            </div>
            <button onClick={() => router.push('/search')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to results
            </button>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ═══ LEFT SIDEBAR ═══ */}
            <aside className="lg:col-span-4 sticky top-24 flex flex-col gap-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                {/* Cruise image */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1599640842225-85d111c60e6b?q=80&w=800"
                    alt={cruise.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                  <div className="absolute bottom-4 left-5">
                    <p className="text-blue-400 font-bold text-[10px] uppercase tracking-widest">{cruise.ship || 'Royal Voyager Fleet'}</p>
                    <p className="text-white font-extrabold text-base leading-tight line-clamp-2">{cruise.name}</p>
                  </div>
                </div>

                {/* Cruise meta */}
                <div className="px-5 py-4 space-y-2.5 border-b border-slate-800">
                  {[
                    { icon: 'calendar_today', label: 'Departure',  val: new Date(cruise.date).toLocaleDateString('en-IN', { day:'numeric',month:'short',year:'numeric' }) },
                    { icon: 'location_on',    label: 'From',       val: cruise.source },
                    { icon: 'place',          label: 'To',         val: cruise.destination },
                    { icon: 'schedule',       label: 'Duration',   val: `${cruise.duration} Night${cruise.duration !== 1 ? 's' : ''}` },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-base">{r.icon}</span>
                        <span className="text-xs font-medium">{r.label}</span>
                      </div>
                      <span className="text-slate-300 text-sm font-semibold text-right">{r.val}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="px-5 py-5 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Price Summary</p>
                  {selectedRooms.map((r, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-400">Room {i+1} ({r.type})</span>
                      <span className="text-slate-200 font-semibold">{fmt(r.price)}<span className="text-slate-500 text-xs">/night</span></span>
                    </div>
                  ))}
                  {selectedRooms.length === 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Cabin (Not selected)</span>
                      <span className="text-slate-200 font-semibold">{fmt(cruise.basePrice)}<span className="text-slate-500 text-xs">/night</span></span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Guests</span>
                    <span className="text-slate-200 font-semibold">× 1 (Per Room Base)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-200 font-semibold">× {duration} nights</span>
                  </div>
                  <div className="h-px bg-slate-800 my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300">Total</span>
                    <span className="text-2xl font-extrabold text-white">{fmt(totalPrice)}</span>
                  </div>
                  <p className="text-xs text-slate-600 text-right">Includes all taxes & fees</p>
                </div>
              </div>

              {/* Guest pill */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-400">group</span>
                <span className="text-slate-300 text-sm font-medium">
                  <span className="text-white font-bold">{adults}</span> adult{adults !== 1 ? 's' : ''}
                  {children > 0 && <>, <span className="text-white font-bold">{children}</span> child{children !== 1 ? 'ren' : ''}</>}
                  {' · '}<span className="text-white font-bold">{requiredRooms} Room{requiredRooms !== 1 ? 's' : ''}</span>
                </span>
              </div>
            </aside>

            {/* ═══ RIGHT CONTENT ═══ */}
            <div className="lg:col-span-8 flex flex-col gap-7">

              {/* Step Navigator */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-6 py-5">
                <div className="flex items-center">
                  {STEPS.map((step, i) => {
                    const done   = currentStep > step.id;
                    const active = currentStep === step.id;
                    return (
                      <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <button
                          onClick={() => done && goTo(step.id)}
                          className={`flex flex-col items-center gap-1.5 transition-all ${done ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 flex-shrink-0
                            ${done   ? 'bg-blue-600 text-white glow-blue'
                            : active ? 'bg-blue-600 text-white ring-4 ring-blue-500/30'
                            :          'bg-slate-800 text-slate-500'}`}>
                            {done
                              ? <span className="material-symbols-outlined text-base" style={{fontVariationSettings:"'FILL' 1"}}>check</span>
                              : <span className="material-symbols-outlined text-base">{step.icon}</span>
                            }
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap
                            ${active ? 'text-blue-400' : done ? 'text-blue-500/70' : 'text-slate-600'}`}>
                            {step.label}
                          </span>
                        </button>
                        {i < STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500
                            ${currentStep > step.id ? 'bg-blue-600' : 'bg-slate-800'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP CONTENT */}
              <div className="fade-slide" key={currentStep}>

                {/* ══ STEP 1 — PARTY SIZE ═══════════════════════════════════ */}
                {currentStep === 1 && (
                  <div className="flex flex-col gap-6">
                    <StepHeader step={1} title="Your trip starts here." subtitle="Confirm the number of guests for your voyage." />
                    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-xl">
                      <div className="flex items-center gap-3 mb-7">
                        <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-400 text-base">group</span>
                        </div>
                        <div>
                          <p className="font-extrabold text-white text-lg">Enter the number of guests</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-5">
                        <GuestStepper label="Adults" sub="Age 18+" icon="person" value={adults} min={1} max={50} onChange={setAdults} />
                        <div className="h-px bg-slate-800" />
                        <GuestStepper label="Children" sub="Age 2–17" icon="child_care" value={children} min={0} max={50} onChange={setChildren} />
                      </div>
                    </div>
                    <PrimaryBtn onClick={() => goTo(2)} label="Continue to Room Selection" icon="arrow_forward" />
                  </div>
                )}

                {/* ══ STEP 2 — ROOM MAP ═════════════════════════════════════ */}
                {currentStep === 2 && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <StepHeader step={2} title="Choose your stateroom." subtitle="Select a cabin category and pick your preferred room on the deck." />
                      <div className="bg-blue-600/20 border border-blue-500/30 px-4 py-2 rounded-xl text-blue-300 font-bold text-sm">
                        Room {currentRoomIndex + 1} of {requiredRooms}
                      </div>
                    </div>

                    {/* Category tabs */}
                    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Room Category</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {decks.map(deck => {
                          const active = selectedRooms[currentRoomIndex]?.roomId === deck.id;
                          const catIcon = deck.type === 'Interior' ? 'bedroom_parent' : deck.type === 'Ocean View' ? 'waves' : deck.type === 'Balcony' ? 'balcony' : 'star';
                          return (
                            <button
                              key={deck.id}
                              onClick={() => { 
                                const newRooms = [...selectedRooms];
                                newRooms[currentRoomIndex] = { roomId: deck.id, roomNumber: '', type: deck.type, price: deck.price, deckNumber: deck.deckNumber };
                                setSelectedRooms(newRooms);
                              }}
                              className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-2xl border-2 font-semibold transition-all duration-200 cursor-pointer
                                ${active ? 'border-blue-500 bg-blue-600/15 text-blue-300 room-active' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                            >
                              <span className={`material-symbols-outlined text-2xl ${active ? 'text-blue-400' : 'text-slate-500'}`}>{catIcon}</span>
                              <span className="text-sm font-bold">{deck.type}</span>
                              <span className={`text-xs font-semibold ${active ? 'text-blue-400' : 'text-slate-500'}`}>{fmt(deck.price)}/night</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deck.availableRooms < 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {deck.availableRooms} left
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Deck Map */}
                    {selectedRooms[currentRoomIndex] && (
                      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Deck {selectedRooms[currentRoomIndex].deckNumber} — {selectedRooms[currentRoomIndex].type}</p>
                            <p className="text-white font-bold text-lg mt-0.5">Select your cabin</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm border-2 border-blue-500 bg-blue-600/20" />Available</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-700 opacity-50" />Occupied</div>
                          </div>
                        </div>

                        {/* Ship silhouette banner */}
                        <div className="bg-slate-800/60 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-slate-500 mb-5">
                          <span className="material-symbols-outlined text-base text-slate-600">directions_boat</span>
                          Royal Voyager Fleet · Deck {selectedRooms[currentRoomIndex].deckNumber} · 16 rooms available
                        </div>

                        {/* Room Grid - 2x8 */}
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 max-w-4xl mx-auto">
                          {decks.find(d => d.id === selectedRooms[currentRoomIndex].roomId)?.slots.slice(0, 16).map((slot: any) => {
                            const isSelected = selectedRooms[currentRoomIndex]?.roomNumber === slot.number;
                            const occupied = slot.status === 'occupied';
                            const isSelectedInOtherRoom = selectedRooms.some((r, i) => i !== currentRoomIndex && r.roomNumber === slot.number);
                            const disabled = occupied || isSelectedInOtherRoom;

                            return (
                              <button
                                key={slot.number}
                                onClick={() => !disabled && setSelectedRooms(prev => {
                                  const next = [...prev];
                                  next[currentRoomIndex] = { ...next[currentRoomIndex], roomNumber: slot.number };
                                  return next;
                                })}
                                disabled={disabled}
                                className={`relative flex flex-col items-center justify-center pt-2.5 pb-2 px-1 rounded-xl border text-[11px] font-bold transition-all duration-200
                                  ${disabled
                                    ? 'border-slate-700 bg-slate-800/50 text-slate-700 opacity-50 cursor-not-allowed'
                                    : isSelected
                                      ? 'border-blue-500 bg-blue-600/20 text-blue-300 room-active scale-105 z-10 cursor-pointer'
                                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-200 cursor-pointer'}`}
                              >
                                {disabled
                                  ? <span className="material-symbols-outlined text-sm mb-0.5" style={{fontVariationSettings:"'FILL' 1"}}>lock</span>
                                  : isSelected
                                    ? <span className="material-symbols-outlined text-sm mb-0.5 text-blue-400" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                                    : <span className="material-symbols-outlined text-sm mb-0.5 text-slate-600">king_bed</span>
                                }
                                {slot.number}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <SecondaryBtn onClick={() => currentRoomIndex > 0 ? setCurrentRoomIndex(i => i - 1) : goTo(1)} label="Back" />
                      {currentRoomIndex < requiredRooms - 1 ? (
                        <PrimaryBtn 
                          onClick={() => selectedRooms[currentRoomIndex]?.roomNumber && setCurrentRoomIndex(i => i + 1)} 
                          label="Next Room" 
                          icon="arrow_forward" 
                          disabled={!selectedRooms[currentRoomIndex]?.roomNumber} 
                        />
                      ) : (
                        <PrimaryBtn 
                          onClick={() => goTo(3)} 
                          label="Continue to Preferences" 
                          icon="arrow_forward" 
                          disabled={selectedRooms.length < requiredRooms || selectedRooms.some(r => !r.roomNumber)} 
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ══ STEP 3 — PREFERENCES (DINING) ════════════════════════ */}
                {currentStep === 3 && (
                  <div className="flex flex-col gap-6">
                    <StepHeader step={3} title="Enhance your experience." subtitle="Select your preferred dining times for the voyage." />

                    {Object.entries(groupedRestaurants)
                      .sort((a, b) => {
                        const order = ['breakfast', 'lunch', 'dinner'];
                        return order.indexOf(a[0]) - order.indexOf(b[0]);
                      })
                      .map(([mealType, allSlots]) => {
                        // Only show unique times for preference selection
                        const uniqueTimes = Array.from(new Set(allSlots.map(s => s.slotTime))).sort();
                        const displaySlots = uniqueTimes.map(time => allSlots.find(s => s.slotTime === time)!).slice(0, 3);
                        
                        // Format date from the first slot
                        const dateStr = allSlots[0]?.slotDate ? new Date(allSlots[0].slotDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '';
                        
                        return (
                          <div key={mealType} className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 shadow-xl">
                            <div className="flex items-center gap-3 mb-8">
                              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400 text-xl" style={{fontVariationSettings:"'FILL' 1"}}>restaurant</span>
                              </div>
                              <h3 className="font-black text-white text-xl uppercase tracking-tighter flex items-center gap-2">
                                {mealType === 'breakfast' ? 'BREAKFAST' : mealType.toUpperCase()} 
                                {dateStr && <span className="text-slate-600 font-medium text-base tracking-normal">({dateStr})</span>}
                              </h3>
                            </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {displaySlots.map(slot => {
                              const isFull = slot.bookedCount >= slot.capacity;
                              const isActive = selectedRestaurants[mealType] === slot.id;
                              const spotsLeft = Math.max(0, slot.capacity - slot.bookedCount);
                              
                              return (
                                <label
                                  key={slot.id}
                                  onClick={() => !isFull && setSelectedRestaurants(prev => ({ ...prev, [mealType]: isActive ? '' : slot.id }))}
                                  className={`flex flex-col items-center justify-center py-8 px-4 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer
                                    ${isFull ? 'border-slate-800 bg-slate-900/30 opacity-40 cursor-not-allowed'
                                    : isActive ? 'border-blue-500 bg-blue-600/10 room-active transform scale-[1.03] z-10'
                                    : 'border-slate-800/60 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50'}`}
                                >
                                  <span className={`material-symbols-outlined text-2xl mb-2 ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>
                                    schedule
                                  </span>
                                  <p className={`font-black text-3xl tracking-tight ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                    {slot.slotTime}
                                  </p>
                                  <p className={`text-[11px] font-black mt-2 uppercase tracking-[0.15em]
                                    ${isActive ? 'text-blue-400' : isFull ? 'text-amber-500' : 'text-slate-600'}`}>
                                    {isFull ? 'WAITLIST' : `${spotsLeft} SPOTS`}
                                  </p>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {Object.keys(groupedRestaurants).length === 0 && (
                      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 text-center">
                        <span className="material-symbols-outlined text-slate-600 text-4xl">restaurant</span>
                        <p className="text-slate-400 mt-3">No dining slots configured yet for this cruise.</p>
                        <p className="text-slate-600 text-sm mt-1">You can add dining preferences after booking.</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <SecondaryBtn onClick={() => goTo(2)} label="Back" />
                      <PrimaryBtn onClick={() => goTo(4)} label="Review your Cruise" icon="arrow_forward" />
                    </div>
                  </div>
                )}

                {/* ══ STEP 4 — REVIEW ════════════════════════════════════════ */}
                {currentStep === 4 && (
                  <div className="flex flex-col gap-6">
                    <StepHeader step={4} title="Review your booking." subtitle="Everything looks good? Confirm the details before proceeding." />

                    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-7 shadow-xl flex flex-col gap-5">
                      <ReviewSection title="Cruise" icon="directions_boat">
                        <ReviewRow label="Voyage"     value={cruise.name} />
                        <ReviewRow label="Departure"  value={new Date(cruise.date).toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })} />
                        <ReviewRow label="Return"     value={new Date(cruise.endDate).toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })} />
                        <ReviewRow label="Route"      value={`${cruise.source} → ${cruise.destination}`} />
                      </ReviewSection>

                      <div className="h-px bg-slate-800" />
                      <ReviewSection title="Stateroom" icon="king_bed">
                        {selectedRooms.map((r, i) => (
                           <ReviewRow key={i} label={`Room ${i+1}`} value={`Cabin ${r.roomNumber} · Deck ${r.deckNumber} (${r.type})`} highlight />
                        ))}
                        <ReviewRow label="Occupancy"  value={`${adults} adult${adults !== 1 ? 's' : ''}${children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}`} />
                      </ReviewSection>

                      {Object.keys(selectedRestaurants).length > 0 && (
                        <>
                          <div className="h-px bg-slate-800" />
                          <ReviewSection title="Dining" icon="restaurant">
                            {Object.entries(selectedRestaurants).filter(([,v]) => v).map(([meal, rId]) => {
                              const r = restaurants.find(x => x.id === rId);
                              return r ? <ReviewRow key={meal} label={meal.charAt(0).toUpperCase() + meal.slice(1)} value={r.slotTime} highlight /> : null;
                            })}
                          </ReviewSection>
                        </>
                      )}

                      <div className="h-px bg-slate-800" />
                      <ReviewSection title="Fare" icon="receipt_long">
                        {selectedRooms.map((r,i) => (
                           <ReviewRow key={i} label={`Room ${i+1} Rate`} value={fmt(r.price) + '/night'} />
                        ))}
                        <ReviewRow label="Duration"  value={`× ${duration} nights`} />
                        <div className="h-px bg-slate-700/50 my-1" />
                        <ReviewRow label="Total"     value={fmt(totalPrice)} highlight />
                      </ReviewSection>
                    </div>

                    <div className="glass-dark bg-slate-900/90 border border-slate-800 rounded-2xl px-7 py-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Trip Total</p>
                        <p className="text-3xl font-extrabold text-white">{fmt(totalPrice)}</p>
                      </div>
                      <div className="flex gap-3">
                        <SecondaryBtn onClick={() => goTo(3)} label="Back" />
                        <PrimaryBtn onClick={() => goTo(5)} label="Continue to Finalize" icon="arrow_forward" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ STEP 5 — FINALIZE & BOOK ══════════════════════════════ */}
                {currentStep === 5 && (
                  <div className="flex flex-col gap-6">
                    <StepHeader step={5} title="Confirm Your Voyage." subtitle="Review one last time and confirm your booking." />

                    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6">
                      {/* Summary */}
                      <div className="bg-blue-950/30 border border-blue-800/30 rounded-2xl p-6">
                        <h4 className="font-extrabold text-blue-300 text-base mb-4">Booking Summary</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between"><span className="text-slate-400">{cruise.name}</span><span className="text-white font-bold">{cruise.source} → {cruise.destination}</span></div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cabins</span>
                            <span className="text-white font-bold">{selectedRooms.map(r => r.roomNumber).join(', ')}</span>
                          </div>
                          <div className="flex justify-between"><span className="text-slate-400">Guests</span><span className="text-white font-bold">{pax} person{pax !== 1 ? 's' : ''}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="text-white font-bold">{duration} night{duration !== 1 ? 's' : ''}</span></div>
                        </div>
                        <div className="border-t border-blue-700/30 mt-4 pt-4 flex justify-between items-center">
                          <span className="text-slate-300 font-bold">Total Amount</span>
                          <span className="text-3xl font-extrabold text-white">{fmt(totalPrice)}</span>
                        </div>
                      </div>

                      {/* Policy */}
                      <div className="flex items-start gap-3 bg-emerald-950/30 border border-emerald-700/20 rounded-2xl p-4">
                        <span className="material-symbols-outlined text-emerald-400 text-xl mt-0.5" style={{fontVariationSettings:"'FILL' 1"}}>shield</span>
                        <div>
                          <p className="text-emerald-300 font-bold text-sm">Free cancellation within 24 hours</p>
                          <p className="text-emerald-600 text-xs mt-0.5">Your booking is protected by our Best Rate Guarantee.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <SecondaryBtn onClick={() => goTo(4)} label="Back" />
                      <button
                        onClick={handleConfirmBooking}
                        disabled={bookingLoading}
                        className="flex-1 flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-extrabold text-lg glow-blue active:scale-95 transition-all cursor-pointer"
                      >
                        {bookingLoading ? (
                          <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                            Confirm Booking · {fmt(totalPrice)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Page wrapper with Suspense ────────────────────────────────────────────────
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">Step {step} of 5</p>
      <h2 className="text-3xl font-extrabold text-white tracking-tight">{title}</h2>
      <p className="text-slate-400 mt-2">{subtitle}</p>
    </div>
  );
}

function PrimaryBtn({ onClick, label, icon, disabled }: { onClick: () => void; label: string; icon?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base transition-all active:scale-95
        ${disabled ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white glow-blue cursor-pointer'}`}>
      {label}
      {icon && <span className="material-symbols-outlined text-xl">{icon}</span>}
    </button>
  );
}

function SecondaryBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-6 py-4 rounded-2xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-semibold transition-all cursor-pointer whitespace-nowrap">
      <span className="material-symbols-outlined text-base">arrow_back</span>
      {label}
    </button>
  );
}

function GuestStepper({ label, sub, icon, value, min, max, onChange }:
  { label: string; sub: string; icon: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-slate-400 text-xl">{icon}</span>
        <div>
          <p className="text-slate-200 font-semibold text-sm">{label}</p>
          <p className="text-slate-500 text-xs">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => value > min && onChange(value - 1)} disabled={value <= min}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all font-bold text-lg leading-none
            ${value <= min ? 'border-slate-800 text-slate-700 cursor-not-allowed' : 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 cursor-pointer'}`}>−</button>
        <span className="text-white font-extrabold text-xl w-6 text-center">{value}</span>
        <button onClick={() => value < max && onChange(value + 1)} disabled={value >= max}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all font-bold text-lg leading-none
            ${value >= max ? 'border-slate-800 text-slate-700 cursor-not-allowed' : 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 cursor-pointer'}`}>+</button>
      </div>
    </div>
  );
}

function ReviewSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-blue-400 text-xl">{icon}</span>
        <h4 className="font-extrabold text-white text-base">{title}</h4>
      </div>
      <div className="flex flex-col gap-2.5 pl-8">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-blue-300' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}
