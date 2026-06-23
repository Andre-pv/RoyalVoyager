"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { useBookingStore } from '@/lib/store';
import { bookShowTransaction, bookGameTransaction, bookRestaurantTransaction, cancelBookingTransaction } from '@/app/actions/booking';
import { 
  ChevronDown, MapPin, Clock, Info, Check, 
  Utensils, Music, Waves, Star, Calendar, 
  Globe, DollarSign, Lightbulb, Ship, ArrowRight,
  Sun, Anchor, Users, Wifi, Coffee, Gamepad2 
} from 'lucide-react';
import Link from 'next/link';

interface CruiseBookingClientProps {
  cruise: any;
  shows: any[];
  games: any[];
  restaurants: any[];
}

export default function CruiseBookingClient({ cruise, shows, games, restaurants }: CruiseBookingClientProps) {
  const [activeTab, setActiveTab] = useState<'dining' | 'shows' | 'activities'>('dining');
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const user = useBookingStore(s => s.user);

  const handleBooking = async (type: 'show' | 'game' | 'restaurant', id: string, name: string) => {
    if (!user) {
      toast.error('Please sign in to book activities.');
      return;
    }

    setBookingLoading(id);
    try {
      let res;
      if (type === 'show') res = await bookShowTransaction(user.id, id);
      else if (type === 'game') res = await bookGameTransaction(user.id, id);
      else res = await bookRestaurantTransaction(user.id, id);

      if (res.success) {
        if (res.status === 'confirmed') toast.success(res.message);
        else if (res.status === 'waitlisted') toast.info(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error('Failed to process booking.');
    } finally {
      setBookingLoading(null);
    }
  };

  return (
    <div className="mt-10">
      {/* TABS SELECTOR */}
      <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-1.5 w-full sm:w-auto sm:inline-flex">
        {[
          { id: 'dining', label: 'Dining & Bars', icon: <Utensils size={16} /> },
          { id: 'shows', label: 'Shows & Entertainment', icon: <Music size={16} /> },
          { id: 'activities', label: 'Onboard Activities', icon: <Waves size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex-1 sm:flex-none justify-center ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white glow-blue'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'dining' && restaurants.map(rest => (
          <ActivityCard 
            key={rest.id} 
            title={`${rest.mealType} at ${rest.slotTime}`} 
            subtitle={`Premium experience on ${new Date(rest.slotDate).toLocaleDateString()}`}
            tag="Restaurant"
            image="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600"
            isLoading={bookingLoading === rest.id}
            onBook={() => handleBooking('restaurant', rest.id, rest.mealType)}
            capacity={rest.capacity}
            bookedCount={rest.bookedCount}
          />
        ))}

        {activeTab === 'shows' && shows.map(show => (
          <ActivityCard 
            key={show.id} 
            title={show.name} 
            subtitle={`${show.time} · ${show.durationMinutes} mins`}
            tag="Show"
            image={show.imageUrl || "https://images.unsplash.com/photo-1508997449629-303059a039c0?q=80&w=600"}
            isLoading={bookingLoading === show.id}
            onBook={() => handleBooking('show', show.id, show.name)}
            capacity={show.capacity}
            bookedCount={show.bookedCount}
          />
        ))}

        {activeTab === 'activities' && games.map(game => (
          <ActivityCard 
            key={game.id} 
            title={game.name} 
            subtitle={`${game.time} · Max Players: ${game.maxPlayers}`}
            tag="Game"
            image={game.imageUrl || "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600"}
            isLoading={bookingLoading === game.id}
            onBook={() => handleBooking('game', game.id, game.name)}
            capacity={game.maxPlayers}
            bookedCount={game.currentPlayers}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ title, subtitle, tag, image, isLoading, onBook, capacity, bookedCount }: any) {
  const isFull = bookedCount >= capacity;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:scale-[1.025] hover:border-blue-800/50 hover:shadow-[0_8px_32px_rgba(37,99,235,0.15)] transition-all duration-300 group flex flex-col h-full">
      <div className="relative h-48 overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full">
          {tag}
        </div>
        {isFull && (
          <div className="absolute top-3 right-3 bg-amber-600/90 text-white text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full animate-pulse">
            Waitlist Available
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-white font-extrabold text-lg">{title}</h3>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{subtitle}</p>
        
        <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <span className="text-slate-500">Availability</span>
          <span className={isFull ? 'text-amber-400' : 'text-emerald-400'}>
            {capacity - bookedCount} Slots Left
          </span>
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${isFull ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, (bookedCount/capacity)*100)}%` }}
          />
        </div>

        <button 
          onClick={onBook}
          disabled={isLoading}
          className={`mt-6 w-full py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
            isFull 
              ? 'bg-amber-600/20 border border-amber-600/40 text-amber-300 hover:bg-amber-600/30' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
          }`}
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {isFull ? 'Join Waitlist' : 'Book Slot'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
