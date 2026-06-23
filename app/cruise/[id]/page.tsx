import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { 
  Anchor, Star, MapPin, Ship, Calendar, Clock, 
  Check, Utensils, Music, Waves, Sun, Coffee, Wifi, ArrowRight,
  Globe, Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import CruiseBookingClient from './CruiseBookingClient';

export default async function CruiseDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // 1. Fetch Cruise details from Prisma
  const cruise = await prisma.cruise.findUnique({
    where: { id },
    include: {
      shows: true,
      games: true,
      restaurants: true,
      rooms: true,
    }
  });

  if (!cruise) {
    notFound();
  }

  // Derived data/Mocked itinerary based on cruise route
  const ITINERARY = [
    {
      day: 1,
      port: cruise.source,
      type: 'Departure',
      time: 'Departs 4:00 PM',
      description: `Your journey begins at ${cruise.source}. Check-in starts at 10:00 AM. Explore the ship's features while we prepare for a ${cruise.duration}-day adventure.`,
      highlights: ['Boarding Celebration', 'Safety Briefing', 'Sunset Departure'],
    },
    {
      day: cruise.duration,
      port: cruise.destination,
      type: 'Arrival',
      time: 'Arrives 8:00 AM',
      description: `Welcome to ${cruise.destination}. Please ensure all personal belongings are packed before disembarkation. We hope you enjoyed your voyage on the ${cruise.ship}!`,
      highlights: ['Farewell Breakfast', 'Final Shore Excursion'],
    },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-body">
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-dark  { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .glow-blue   { box-shadow: 0 0 20px rgba(37,99,235,0.45), 0 4px 16px rgba(0,0,0,0.4); }
        .badge-shimmer {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 40%, #3b82f6 80%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes shimmer {
          0%   { background-position:  200% center; }
          100% { background-position: -200% center; }
        }
      `}} />

      {/* TOP NAV */}
      <header className="sticky top-0 z-50 glass-dark bg-slate-950/85 border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Anchor size={22} className="text-blue-500" />
            <span className="text-xl font-extrabold tracking-tight text-white font-headline">Royal Voyager</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <Link href="/search" className="text-slate-400 hover:text-white transition-colors">Cruises</Link>
            <span className="text-blue-400 border-b-2 border-blue-500 pb-0.5">Destinations</span>
            <button className="text-slate-400 hover:text-white transition-colors">Ships</button>
            <button className="text-slate-400 hover:text-white transition-colors">Deals</button>
          </nav>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full font-bold text-sm glow-blue active:scale-95 transition-all">
            Book Now
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative h-[80vh] w-full overflow-hidden">
        <img 
          src={cruise.imageUrl || "https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=2000"} 
          alt={cruise.name}
          className="absolute inset-0 w-full h-full object-cover scale-105"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-8 pb-14 max-w-screen-xl mx-auto">
          <div className="max-w-screen-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 px-4 py-1.5 rounded-full mb-5">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="badge-shimmer text-xs font-extrabold tracking-[0.2em] uppercase">2026 Collection</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.04] tracking-tighter max-w-4xl">
              {cruise.name.split('-').map((word: string, i: number) => (
                <span key={i}>{word}{i < cruise.name.split('-').length - 1 ? '-' : ''}<br /></span>
              ))}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin size={16} className="text-blue-400" />
                <span className="text-base font-medium">{cruise.source} → {cruise.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Ship size={16} className="text-blue-400" />
                <span className="text-base font-medium">{cruise.ship}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={16} className="text-blue-400" />
                <span className="text-base font-medium">{new Date(cruise.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE BOOKING BAR */}
      <div className="sticky top-[72px] z-40 bg-slate-900 border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Starts From</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white">${cruise.basePrice}</span>
                <span className="text-slate-400 font-medium text-sm">USD / person</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><Clock size={15} /> {cruise.duration} Nights</span>
              <span className="flex items-center gap-1.5"><MapPin size={15} /> {ITINERARY.length} Ports</span>
              <span className="flex items-center gap-1.5"><Utensils size={15} /> All Meals</span>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-extrabold glow-blue transition-all">
            Continue to Checkout
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <section className="mb-20">
          <h2 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">Your Itinerary</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-10">Day by Day Expedition</h3>
          <div className="flex flex-col gap-4">
            {ITINERARY.map((day) => (
              <div key={day.day} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
                <div className="bg-blue-600 text-white w-14 h-14 rounded-xl flex flex-col items-center justify-center font-extrabold flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-widest opacity-70">Day</span>
                  <span className="text-2xl leading-none">{day.day}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white mb-2">{day.port} — {day.type}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">{day.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {day.highlights.map(h => (
                      <span key={h} className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">Onboard Experience</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-10">Select Your Daily Highlights</h3>
          <CruiseBookingClient 
            cruise={cruise}
            shows={cruise.shows}
            games={cruise.games}
            restaurants={cruise.restaurants}
          />
        </section>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 bg-slate-900/30">
        <div className="max-w-screen-xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Anchor size={20} className="text-blue-500" />
            <span className="font-extrabold text-white">Royal Voyager</span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 Royal Voyager Cruises · Licensed for the Seven Seas
          </div>
        </div>
      </footer>
    </div>
  );
}
