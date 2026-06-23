'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface Show { id: string; name: string; time: string; showDate: string; durationMinutes: number; capacity: number; bookedCount: number; isHighlight: boolean; description?: string; }
interface Game { id: string; name: string; time: string; gameDate: string; durationMinutes: number; maxPlayers: number; currentPlayers: number; isHighlight: boolean; description?: string; }
interface Restaurant { id: string; name: string; mealType: string; slotTime: string; slotDate: string; durationMinutes: number; capacity: number; bookedCount: number; description?: string; }
interface Booking { id: string; cruise: { name: string; date: string; endDate: string; duration: number; }; showBookings: { showId: string }[]; gameBookings: { gameId: string }[]; restaurantBookings: { restaurantId: string }[]; }

type SelectedItem = {
  id: string;
  type: "SHOW" | "GAME" | "RESTAURANT";
  title: string;
  startTime: Date;
  endTime: Date;
  dateStr: string;
  duration: number;
  isHighlight: boolean;
  mealType?: string;
};

const parseDateTime = (dateStr: string, timeStr: string) => {
  const [yy, mm, dd] = dateStr.split('T')[0].split('-');
  const [hh, min] = timeStr.split(':');
  return new Date(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
};

const isConflict = (a: SelectedItem, b: SelectedItem) => {
  return a.startTime < b.endTime && b.startTime < a.endTime;
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTimeShort = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function VoyagePage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { data: session, status } = useSession();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [schedule, setSchedule] = useState<SelectedItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [filterType, setFilterType] = useState<"ALL" | "SHOW" | "GAME" | "RESTAURANT">("ALL");

  const [conflictModal, setConflictModal] = useState<{newItem: SelectedItem; existingItem: SelectedItem} | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/'); return; }
    if (status !== 'authenticated') return;

    fetch('/api/bookings')
      .then(r => r.json())
      .then(async d => {
        const b = (d.bookings || []).find((x: any) => x.id === bookingId);
        if (!b) { router.replace('/dashboard'); return; }
        setBooking(b);

        const cr = await fetch(`/api/cruise/${b.cruise.id}`).then(r => r.json());
        if (cr.cruise) {
          const s = cr.cruise.shows || [];
          const g = cr.cruise.games || [];
          const rList = cr.cruise.restaurants || [];
          setShows(s);
          setGames(g);
          setRestaurants(rList);
          
          const initialSchedule: SelectedItem[] = [];
          
          b.showBookings?.forEach((sb: any) => {
            const show = s.find((x: Show) => x.id === sb.showId);
            if (show) {
               const st = parseDateTime(show.showDate, show.time);
               const et = new Date(st.getTime() + show.durationMinutes * 60000);
               initialSchedule.push({ id: show.id, type: "SHOW", title: show.name, startTime: st, endTime: et, dateStr: show.showDate.split('T')[0], duration: show.durationMinutes, isHighlight: show.isHighlight });
            }
          });
          
          b.gameBookings?.forEach((gb: any) => {
            const game = g.find((x: Game) => x.id === gb.gameId);
            if (game) {
               const st = parseDateTime(game.gameDate, game.time);
               const et = new Date(st.getTime() + game.durationMinutes * 60000);
               initialSchedule.push({ id: game.id, type: "GAME", title: game.name, startTime: st, endTime: et, dateStr: game.gameDate.split('T')[0], duration: game.durationMinutes, isHighlight: game.isHighlight });
            }
          });

          b.restaurantBookings?.forEach((rb: any) => {
            const res = rList.find((x: Restaurant) => x.id === rb.restaurantId);
            if (res) {
               const st = parseDateTime(res.slotDate, res.slotTime);
               const et = new Date(st.getTime() + res.durationMinutes * 60000);
               initialSchedule.push({ id: res.id, type: "RESTAURANT", title: res.name, startTime: st, endTime: et, dateStr: res.slotDate.split('T')[0], duration: res.durationMinutes, isHighlight: false, mealType: res.mealType });
            }
          });
          
          setSchedule(initialSchedule.sort((a,b) => a.startTime.getTime() - b.startTime.getTime()));
          
          const dates = Array.from(new Set([
              ...s.map((x: any) => x.showDate.split('T')[0]), 
              ...g.map((x: any) => x.gameDate.split('T')[0]),
              ...rList.map((x: any) => x.slotDate.split('T')[0])
           ])).sort();
          if (dates.length > 0) setSelectedDay(dates[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, bookingId, router]);

  const allDates = useMemo(() => {
    return Array.from(new Set([
        ...shows.map(s => s.showDate.split('T')[0]), 
        ...games.map(g => g.gameDate.split('T')[0]),
        ...restaurants.map(r => r.slotDate.split('T')[0])
    ])).sort();
  }, [shows, games, restaurants]);
  
  const filteredActivities = useMemo(() => {
    const list: (Show | Game | Restaurant & { type: "SHOW"|"GAME"|"RESTAURANT" })[] = [];
    shows.filter(s => s.showDate.split('T')[0] === selectedDay).forEach(s => list.push({ ...s, type: "SHOW" } as any));
    games.filter(g => g.gameDate.split('T')[0] === selectedDay).forEach(g => list.push({ ...g, type: "GAME" } as any));
    restaurants.filter(r => r.slotDate.split('T')[0] === selectedDay).forEach(r => list.push({ ...r, type: "RESTAURANT", time: r.slotTime, isHighlight: false } as any));
    
    return list.filter(item => {
       if (filterType !== "ALL" && item.type !== filterType) return false;
       return true;
    }).sort((a: any, b: any) => {
        const timeA = a.time || a.slotTime;
        const timeB = b.time || b.slotTime;
        const dateA = a.showDate || a.gameDate || a.slotDate;
        const dateB = b.showDate || b.gameDate || b.slotDate;
        return parseDateTime(dateA, timeA).getTime() - parseDateTime(dateB, timeB).getTime();
    });
  }, [shows, games, restaurants, selectedDay, filterType]);

  const getConflicts = (item: SelectedItem) => {
    return schedule.filter(existing => existing.id !== item.id && isConflict(existing, item));
  };
  
  const handleToggle = (item: any, type: "SHOW"|"GAME"|"RESTAURANT") => {
    const exists = schedule.find(x => x.id === item.id);
    if (exists) {
      setSchedule(prev => prev.filter(x => x.id !== item.id));
      return;
    }

    const itemDate = item.showDate || item.gameDate || item.slotDate;
    const itemTime = item.time || item.slotTime;
    const st = parseDateTime(itemDate, itemTime);
    const et = new Date(st.getTime() + item.durationMinutes * 60000);
    const newItem: SelectedItem = {
      id: item.id, type, title: item.name, startTime: st, endTime: et, dateStr: itemDate.split('T')[0], duration: item.durationMinutes, isHighlight: item.isHighlight || false, mealType: item.mealType
    };
    
    const conflicts = getConflicts(newItem);
    
    // Check Food vs Event conflict
    const foodConflict = conflicts.find(c => (c.type === "RESTAURANT" && newItem.type !== "RESTAURANT") || (c.type !== "RESTAURANT" && newItem.type === "RESTAURANT"));

    if (foodConflict) {
        setConflictModal({ newItem, existingItem: foodConflict });
        return; 
    }

    if (conflicts.length > 0) {
      toast.warning(`Warning: Conflicts with ${conflicts.map(c => c.title).join(', ')}`);
    } else {
      toast.success(`Added ${item.name}`);
    }
    setSchedule(prev => [...prev, newItem].sort((a,b) => a.startTime.getTime() - b.startTime.getTime()));
  };

  const generatePlan = () => {
      const allItems: SelectedItem[] = [];
      shows.forEach(s => {
        const st = parseDateTime(s.showDate, s.time);
        allItems.push({ id: s.id, type: "SHOW", title: s.name, startTime: st, endTime: new Date(st.getTime() + s.durationMinutes * 60000), dateStr: s.showDate.split('T')[0], duration: s.durationMinutes, isHighlight: s.isHighlight });
      });
      games.forEach(g => {
        const st = parseDateTime(g.gameDate, g.time);
        allItems.push({ id: g.id, type: "GAME", title: g.name, startTime: st, endTime: new Date(st.getTime() + g.durationMinutes * 60000), dateStr: g.gameDate.split('T')[0], duration: g.durationMinutes, isHighlight: g.isHighlight });
      });
      // Do not auto-generate restaurants as they are usually 1 per mealtype and user specific.
      
      allItems.sort((a, b) => {
          if (a.isHighlight && !b.isHighlight) return -1;
          if (!a.isHighlight && b.isHighlight) return 1;
          return a.duration - b.duration;
      });
  
      let newSchedule = [...schedule];
      let addedCount = 0;
      
      allItems.forEach(item => {
          if (!newSchedule.find(x => x.id === item.id)) {
              const hasConflict = newSchedule.some(existing => isConflict(existing, item));
              if (!hasConflict) {
                  newSchedule.push(item);
                  addedCount++;
              }
          }
      });
      
      if (addedCount > 0) {
          newSchedule.sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
          setSchedule(newSchedule);
          toast.success(`AI added ${addedCount} activities to your plan!`);
      } else {
          toast.info(`Schedule is already full or no new non-conflicting activities found.`);
      }
  };

  const optimizeSchedule = () => {
     const toRemove = new Set<string>();
     
     for (let i = 0; i < schedule.length; i++) {
         for (let j = i + 1; j < schedule.length; j++) {
             if (isConflict(schedule[i], schedule[j])) {
                 // Never auto-remove food. If there's food and an event, remove the event.
                 if (schedule[i].type === "RESTAURANT" && schedule[j].type !== "RESTAURANT") {
                     toRemove.add(schedule[j].id);
                 } else if (schedule[j].type === "RESTAURANT" && schedule[i].type !== "RESTAURANT") {
                     toRemove.add(schedule[i].id);
                 }
                 else if (!schedule[i].isHighlight && schedule[j].isHighlight) {
                     toRemove.add(schedule[i].id);
                 } else {
                     toRemove.add(schedule[j].id);
                 }
             }
         }
     }
     
     if (toRemove.size > 0) {
         setSchedule(prev => prev.filter(x => !toRemove.has(x.id)));
         toast.success(`Optimized schedule: removed ${toRemove.size} conflicting activities.`);
     } else {
         toast.info(`Your schedule is already conflict-free!`);
     }
  };

  const resolveConflict = (action: "ALT_FOOD" | "ALT_EVENT" | "CANCEL_EVENT", payloadId?: string) => {
    if (!conflictModal) return;
    const { newItem, existingItem } = conflictModal;
    
    let newSched = [...schedule];

    const theFood = [newItem, existingItem].find(x => x.type === "RESTAURANT")!;
    const theEvent = [newItem, existingItem].find(x => x.type !== "RESTAURANT")!;

    if (action === "ALT_FOOD" && payloadId) {
        if (existingItem.id === theFood.id) newSched = newSched.filter(x => x.id !== existingItem.id);
        if (newItem.id === theEvent.id) newSched.push(theEvent);

        const altR = restaurants.find(r => r.id === payloadId);
        if (altR) {
            const st = parseDateTime(altR.slotDate, altR.slotTime);
            newSched.push({ id: altR.id, type: "RESTAURANT", title: altR.name, startTime: st, endTime: new Date(st.getTime() + altR.durationMinutes * 60000), dateStr: altR.slotDate.split('T')[0], duration: altR.durationMinutes, isHighlight: false, mealType: altR.mealType });
        }
    } 
    else if (action === "ALT_EVENT" && payloadId) {
        if (existingItem.id === theEvent.id) newSched = newSched.filter(x => x.id !== existingItem.id);
        if (newItem.id === theFood.id) newSched.push(theFood);

        const altE = [...shows, ...games].find(e => e.id === payloadId);
        if (altE) {
            const eType = altE.hasOwnProperty('capacity') ? "SHOW" : "GAME";
            const time = (altE as any).time;
            const date = (altE as any).showDate || (altE as any).gameDate;
            const st = parseDateTime(date, time);
            newSched.push({ id: altE.id, type: eType, title: altE.name, startTime: st, endTime: new Date(st.getTime() + altE.durationMinutes * 60000), dateStr: date.split('T')[0], duration: altE.durationMinutes, isHighlight: altE.isHighlight });
        }
    }
    else if (action === "CANCEL_EVENT") {
        if (existingItem.id === theEvent.id) newSched = newSched.filter(x => x.id !== existingItem.id);
        if (newItem.id === theFood.id) newSched.push(newItem);
    }

    setSchedule(newSched.sort((a,b) => a.startTime.getTime() - b.startTime.getTime()));
    setConflictModal(null);
    toast.success("Conflict Resolved seamlessly!");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          showIds: schedule.filter(x=>x.type==="SHOW").map(x=>x.id),
          gameIds: schedule.filter(x=>x.type==="GAME").map(x=>x.id),
          restaurantIds: schedule.filter(x=>x.type==="RESTAURANT").map(x=>x.id),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Itinerary saved successfully!');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Calculate generic alternates for the modal view
  let altFoods: Restaurant[] = [];
  let altEvents: (Show|Game)[] = [];
  if (conflictModal) {
      const { newItem, existingItem } = conflictModal;
      const theFood = [newItem, existingItem].find(x => x.type === "RESTAURANT")!;
      const theEvent = [newItem, existingItem].find(x => x.type !== "RESTAURANT")!;
      
      // altFoods: same mealType, same date, but doesn't overlap with theEvent
      altFoods = restaurants.filter(r => {
         if (r.mealType !== theFood.mealType || r.slotDate.split('T')[0] !== theFood.dateStr) return false;
         if (r.id === theFood.id) return false;
         const strT = parseDateTime(r.slotDate, r.slotTime);
         const endT = new Date(strT.getTime() + r.durationMinutes * 60000);
         // Simulate checking overlap vs theEvent
         if (strT < theEvent.endTime && theEvent.startTime < endT) return false; 
         return r.bookedCount < r.capacity; // keep available
      });

      // altEvents: same name, same date, but doesn't overlap with theFood
      const allE = [...shows, ...games];
      altEvents = allE.filter(e => {
         const dStr = (e as any).showDate || (e as any).gameDate;
         if (e.name !== theEvent.title || dStr.split('T')[0] !== theEvent.dateStr) return false;
         if (e.id === theEvent.id) return false;
         const strT = parseDateTime(dStr, (e as any).time);
         const endT = new Date(strT.getTime() + e.durationMinutes * 60000);
         // Simulate checking overlap vs theFood
         if (strT < theFood.endTime && theFood.startTime < endT) return false;
         
         const cap = (e as any).capacity || (e as any).maxPlayers;
         const booked = (e as any).bookedCount || (e as any).currentPlayers;
         return booked < cap;
      });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; display:inline-block;vertical-align:middle; }
        .glass-dark { backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }
        .glow-blue { box-shadow:0 0 20px rgba(37,99,235,.4),0 4px 16px rgba(0,0,0,.4); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        
        .modal-overlay { backdrop-filter: blur(8px); }
        .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(40px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}} />

      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans relative">
        <header className="sticky top-0 z-50 glass-dark bg-slate-950/85 border-b border-slate-800 flex-shrink-0 h-[73px]">
          <div className="max-w-[1600px] w-full mx-auto px-6 h-full flex items-center justify-between">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2.5 hover:opacity-80">
              <span className="material-symbols-outlined text-blue-500 text-2xl">anchor</span>
              <span className="text-xl font-extrabold tracking-tight text-white">Royal Voyager</span>
            </button>
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm font-medium">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              My Bookings
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          
          <aside className="w-64 flex-shrink-0 bg-slate-950/80 border-r border-slate-800 p-5 overflow-y-auto hidden md:block">
              <h3 className="text-white font-bold mb-4">Select Day</h3>
              <div className="space-y-2 mb-8">
                 {allDates.map(date => (
                    <button key={date} onClick={() => setSelectedDay(date)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedDay === date ? 'bg-blue-600/20 border border-blue-500 text-blue-400' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
                        <span className="block text-xs font-bold uppercase mb-1">Day {allDates.indexOf(date) + 1}</span>
                        <span className="font-medium text-sm">{fmtDate(date)}</span>
                    </button>
                 ))}
              </div>
              
              <h3 className="text-white font-bold mb-4 flex justify-between items-center">
                 Filters
                 <button onClick={() => setFilterType("ALL")} className="text-blue-500 text-xs font-semibold hover:underline bg-transparent border-none">Clear All</button>
              </h3>
              <div className="space-y-3">
                 <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Categories</p>
                    <label className="flex items-center gap-3 mb-2 cursor-pointer">
                       <input type="radio" checked={filterType==="ALL"} onChange={() => setFilterType("ALL")} className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-700" />
                       <span className="text-sm text-slate-300">All</span>
                    </label>
                    <label className="flex items-center gap-3 mb-2 cursor-pointer">
                       <input type="radio" checked={filterType==="SHOW"} onChange={() => setFilterType("SHOW")} className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-700" />
                       <span className="text-sm text-slate-300 flex items-center gap-2"><span className="material-symbols-outlined text-sm text-blue-400">theater_comedy</span> Shows</span>
                    </label>
                    <label className="flex items-center gap-3 mb-2 cursor-pointer">
                       <input type="radio" checked={filterType==="GAME"} onChange={() => setFilterType("GAME")} className="w-4 h-4 text-purple-500 bg-slate-800 border-slate-700" />
                       <span className="text-sm text-slate-300 flex items-center gap-2"><span className="material-symbols-outlined text-sm text-purple-400">sports_esports</span> Activities</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                       <input type="radio" checked={filterType==="RESTAURANT"} onChange={() => setFilterType("RESTAURANT")} className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-700" />
                       <span className="text-sm text-slate-300 flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">restaurant</span> Restaurants</span>
                    </label>
                 </div>
              </div>
          </aside>

          <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
              <div className="max-w-5xl mx-auto">
                 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
                    <div className="relative z-10">
                       <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-1 shadow-sm">Personalise Your Voyage</p>
                       <h1 className="text-3xl font-extrabold text-white tracking-tight">{booking?.cruise.name}</h1>
                       <p className="text-slate-400 mt-2 text-sm max-w-lg">Choose shows, activities, and dining slots.</p>
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 min-w-[240px]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-amber-400">auto_awesome</span>
                                <span className="text-white font-bold text-sm">Build My Perfect Day</span>
                            </div>
                            <p className="text-slate-500 text-[11px] mb-3 leading-tight">Let our AI create a personalized itinerary based on your interests.</p>
                            <button onClick={generatePlan} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all glow-blue group border-none">
                               <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">auto_fix_high</span>
                               Generate Plan
                            </button>
                        </div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                     {filteredActivities.length === 0 ? (
                        <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-3xl">
                            <span className="material-symbols-outlined text-slate-700 text-4xl mb-2">search_off</span>
                            <p className="text-slate-400 font-medium">No activities found for this filter</p>
                        </div>
                     ) : (
                         filteredActivities.map((item: any) => {
                             const isSelected = !!schedule.find(x => x.id === item.id);
                             const capacity = item.type === "SHOW" ? item.capacity : item.type === "GAME" ? item.maxPlayers : item.capacity;
                             const booked = item.type === "SHOW" ? item.bookedCount : item.type === "GAME" ? item.currentPlayers : item.bookedCount;
                             const isFull = booked >= capacity;

                             return (
                                 <ExperienceCard 
                                    key={item.id}
                                    item={item}
                                    isSelected={isSelected}
                                    isFull={isFull}
                                    capacity={capacity}
                                    booked={booked}
                                    onToggle={() => !isFull && handleToggle(item, item.type)}
                                 />
                             )
                         })
                     )}
                 </div>
              </div>
          </main>

          <aside className="w-80 flex-shrink-0 bg-slate-900/30 border-l border-slate-800 flex flex-col hidden lg:flex">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
                  <h2 className="text-white font-extrabold flex items-center gap-2">
                     My Schedule
                     <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{schedule.length}</span>
                  </h2>
                  <button onClick={() => setSchedule([])} className="text-blue-500 text-xs font-semibold hover:text-blue-400 transition-colors bg-transparent border-none">Clear</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                 {allDates.map(date => {
                     const dayItems = schedule.filter(x => x.dateStr === date);
                     if (dayItems.length === 0) return null;
                     
                     return (
                         <div key={date}>
                             <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">{fmtDate(date)}</h3>
                             <div className="space-y-3">
                                 {dayItems.map(item => {
                                     const conflicts = getConflicts(item);
                                     const hasConflictWarning = conflicts.length > 0;
                                     
                                     return (
                                         <div key={item.id} className={`group relative p-3 rounded-xl border ${hasConflictWarning ? 'bg-amber-950/20 border-amber-900/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'} transition-all`}>
                                             <div className="flex justify-between items-start mb-1.5">
                                                 <p className="text-slate-400 text-[11px] font-bold flex items-center gap-1">
                                                     <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                     {fmtTimeShort(item.startTime)}
                                                 </p>
                                                 <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ${item.type === "SHOW" ? 'bg-blue-500/20 text-blue-400' : item.type === "RESTAURANT" ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                     {item.type} {item.mealType && `(${item.mealType})`}
                                                 </span>
                                             </div>
                                             <h4 className="text-white text-sm font-bold leading-tight mb-1 pr-6">{item.title}</h4>
                                             {hasConflictWarning && (
                                                 <div className="mt-3 p-2 bg-amber-500/10 border border-amber-900/50 rounded-lg flex items-start gap-2">
                                                     <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5" style={{fontVariationSettings:"'FILL' 1"}}>warning</span>
                                                     <div>
                                                         <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Conflict Detected</p>
                                                         <p className="text-amber-400/80 text-[10px] leading-tight flex flex-col">
                                                            <span>Overlaps with:</span>
                                                            <span className="font-semibold text-amber-500 truncate max-w-[180px]">{conflicts[0].title}</span>
                                                         </p>
                                                     </div>
                                                 </div>
                                             )}
                                             <button onClick={() => setSchedule(prev => prev.filter(x => x.id !== item.id))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-all flex items-center justify-center">
                                                 <span className="material-symbols-outlined text-sm">close</span>
                                             </button>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     )
                 })}
                 {schedule.length === 0 && (
                     <div className="text-center py-10">
                         <div className="w-16 h-16 rounded-full bg-slate-900/80 flex items-center justify-center mx-auto mb-4 border border-slate-800">
                            <span className="material-symbols-outlined text-slate-600 text-3xl">event_note</span>
                         </div>
                         <p className="text-slate-300 font-semibold text-sm">Your schedule is empty</p>
                         <p className="text-slate-500 text-xs mt-1">Add activities from the left</p>
                     </div>
                 )}
              </div>

              <div className="p-5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
                  <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm">assignment</span> Summary
                  </h3>
                  <div className="flex justify-between text-xs mb-5 px-1">
                      <div className="flex flex-col items-center">
                          <span className="block text-blue-400 font-extrabold text-lg leading-tight mb-1">{schedule.length}</span>
                          <span className="text-slate-500 font-semibold tracking-wide uppercase text-[9px]">Activities</span>
                      </div>
                      <div className="w-px h-8 bg-slate-800" />
                      <div className="flex flex-col items-center">
                          <span className="block text-purple-400 font-extrabold text-lg leading-tight mb-1">
                              {Math.floor(schedule.reduce((acc, curr) => acc + curr.duration, 0) / 60)}h{' '}
                              {schedule.reduce((acc, curr) => acc + curr.duration, 0) % 60}m
                          </span>
                          <span className="text-slate-500 font-semibold tracking-wide uppercase text-[9px]">Total Time</span>
                      </div>
                  </div>
                  <div className="flex flex-col gap-2">
                      <button onClick={optimizeSchedule} className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl font-bold text-xs transition-all">
                          <span className="material-symbols-outlined text-sm">magic_button</span>
                          Optimize Schedule
                      </button>
                      <button disabled={saving} onClick={handleSave} className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all glow-blue border-none">
                          {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><span className="material-symbols-outlined text-sm">check_circle</span> Finalize & Save</>}
                      </button>
                  </div>
              </div>
          </aside>
        </div>
      </div>

      {/* CONFLICT MODAL */}
      {conflictModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 modal-overlay px-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden slide-up flex flex-col">
                  {/* Header */}
                  <div className="bg-amber-950/30 border-b border-amber-900/40 p-6 flex flex-col items-center text-center relative">
                      <button onClick={() => setConflictModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
                      <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,.1)]">
                          <span className="material-symbols-outlined text-amber-500 text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>warning</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-white mb-2 tracking-tight">Scheduling Conflict Detected</h2>
                      <p className="text-slate-400 text-sm max-w-md">The item you selected overlaps with an existing food or event slot. Please choose how you'd like to resolve this.</p>
                  </div>
                  
                  {/* Body */}
                  <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
                      
                      {/* Option 1: Alternate Food */}
                      {altFoods.length > 0 && (
                          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl hover:border-blue-500 hover:bg-slate-800 transition-colors group">
                             <div className="flex items-center gap-3 mb-3">
                                <span className="material-symbols-outlined text-blue-400 bg-blue-500/10 p-2 rounded-lg">restaurant</span>
                                <div>
                                   <div className="text-white font-bold text-sm">1. Alternate time slot for having food</div>
                                   <div className="text-slate-400 text-xs mt-0.5">Keep the event, move food.</div>
                                </div>
                             </div>
                             <div className="pl-12 flex gap-2 overflow-x-auto pb-1">
                                {altFoods.map(alt => (
                                    <button key={alt.id} onClick={() => resolveConflict("ALT_FOOD", alt.id)} className="flex-shrink-0 bg-slate-900 hover:bg-blue-600 hover:text-white border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl transition-colors font-medium">
                                        {alt.name} at {alt.slotTime}
                                    </button>
                                ))}
                             </div>
                          </div>
                      )}
                      
                      {/* Option 2: Alternate Event */}
                      {altEvents.length > 0 && (
                          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl hover:border-purple-500 hover:bg-slate-800 transition-colors group">
                             <div className="flex items-center gap-3 mb-3">
                                <span className="material-symbols-outlined text-purple-400 bg-purple-500/10 p-2 rounded-lg">event_repeat</span>
                                <div>
                                   <div className="text-white font-bold text-sm">2. Alternate events that do not affect the food time</div>
                                   <div className="text-slate-400 text-xs mt-0.5">Keep food, move the event to a different time.</div>
                                </div>
                             </div>
                             <div className="pl-12 flex gap-2 overflow-x-auto pb-1">
                                {altEvents.map(alt => (
                                    <button key={alt.id} onClick={() => resolveConflict("ALT_EVENT", alt.id)} className="flex-shrink-0 bg-slate-900 hover:bg-purple-600 hover:text-white border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl transition-colors font-medium">
                                        {(alt as any).time}
                                    </button>
                                ))}
                             </div>
                          </div>
                      )}
                      
                      {/* Option 3: Cancel Event */}
                      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl hover:border-red-500 hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer" onClick={() => resolveConflict("CANCEL_EVENT")}>
                         <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-red-400 bg-red-500/10 p-2 rounded-lg">event_busy</span>
                            <div>
                               <div className="text-white font-bold text-sm">3. Cancel the event booking</div>
                               <div className="text-slate-400 text-xs mt-0.5">Prioritize food and drop the event entirely.</div>
                            </div>
                         </div>
                         <span className="material-symbols-outlined text-slate-500">chevron_right</span>
                      </div>

                  </div>
              </div>
          </div>
      )}

    </>
  );
}

function ExperienceCard({ item, isSelected, isFull, capacity, booked, onToggle }: any) {
  const pct = Math.min(100, (booked / capacity) * 100);
  const tagColor = item.type === "SHOW" ? 'blue' : item.type === "RESTAURANT" ? 'emerald' : 'purple';
  const tagCls = tagColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : tagColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  const borderCls = isSelected
    ? 'border-blue-500 shadow-[0_0_20px_rgba(37,99,235,.2)]'
    : 'border-slate-800 hover:border-slate-700';

  const SHOW_IMGS = ['/images/show_comedy.png', '/images/show_magic.png', '/images/show_dance.png'];
  const GAME_IMGS = ['/images/game_poolside.png', '/images/game_yoga.png', '/images/game_casino.png'];
  const REST_IMGS = ['https://ix-royal-voyages.vercel.app/images/restaurant_1.png', 'https://ix-royal-voyages.vercel.app/images/restaurant_2.png', 'https://ix-royal-voyages.vercel.app/images/restaurant_3.png']; // Fallbacks
  
  let hash = 0;
  for (let i = 0; i < item.name.length; i++) hash = item.name.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % 3;
  // If images are missing, they degrade gracefully since there is a fallback bg gradient
  const imageUrl = item.type === "SHOW" ? SHOW_IMGS[idx] : item.type === "GAME" ? GAME_IMGS[idx] : REST_IMGS[idx];

  return (
    <div className={`relative rounded-[24px] border border-[1.5px] bg-slate-900/60 ${borderCls} transition-all duration-300 overflow-hidden flex flex-col ${isFull && !isSelected ? 'opacity-50 grayscale-[50%]' : 'group'}`}>
      
      <div className="relative h-44 w-full overflow-hidden bg-slate-800">
          <img src={imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-transparent" />
          {item.isHighlight && <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-2.5 py-1.5 rounded-xl border border-amber-500/30 flex items-center justify-center shadow-xl"><span className="material-symbols-outlined text-amber-400 text-[16px]" style={{fontVariationSettings:"'FILL' 1"}} title="Highly Rated">kid_star</span></div>}
          <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full border bg-black/60 backdrop-blur-md ${tagCls}`}>{item.type} {item.mealType && `(${item.mealType})`}</span>
                {isFull && !isSelected && <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-500/20 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 border border-red-500/30"><span className="material-symbols-outlined text-[10px]">close</span> Full</span>}
              </div>
              <h3 className="font-extrabold text-white text-[18px] leading-snug drop-shadow-md">{item.name}</h3>
          </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
          <div className="flex flex-col gap-2 text-slate-400 text-xs font-semibold mb-4">
              <span className="flex items-center gap-2 text-slate-300"><span className="material-symbols-outlined text-[15px] text-blue-400">schedule</span> {item.time || item.slotTime} ({item.durationMinutes} min)</span>
              {item.isHighlight && <span className="flex items-center gap-2 text-amber-500"><span className="material-symbols-outlined text-[15px]">grade</span> 4.8 Highly Rated</span>}
          </div>
          
          {item.description && <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed mb-4">{item.description}</p>}
          
          <div className="mt-auto">
              <div className="flex justify-between items-center mb-3">
                  <div className="flex-1 mr-4">
                      <div className="flex justify-between text-[10px] font-bold tracking-wide uppercase mb-1.5">
                          <span className={pct >= 90 ? 'text-amber-500' : 'text-emerald-500'}>{pct >= 90 ? 'Filling Fast' : 'Plenty Available'}</span>
                          <span className="text-slate-500">{capacity - booked} / {capacity}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                  </div>
                  <button onClick={onToggle} disabled={isFull && !isSelected} className={`shrink-0 h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-none ${isSelected ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,.4)]' : 'bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300'}`}>
                      {isSelected ? <><span className="material-symbols-outlined text-sm">check</span> Added</> : <><span className="material-symbols-outlined text-sm">add</span> {item.type==="RESTAURANT"?"Book":"Add"}</>}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}
