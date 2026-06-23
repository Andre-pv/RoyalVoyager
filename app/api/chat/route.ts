import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const lowerMsg = message.toLowerCase();

    // ─── 1. FETCH DYNAMIC DESTINATIONS ────────────────────────────────────
    // Fetch unique destinations and region names from the database
    const [allDestinations, allRegions] = await Promise.all([
      prisma.cruise.findMany({ select: { destination: true }, distinct: ['destination'] }),
      prisma.region.findMany({ select: { name: true } }),
    ]);

    const destList = allDestinations.map(d => d.destination.toLowerCase());
    const regionList = allRegions.map(r => r.name.toLowerCase());

    // ─── 2. HEURISTIC INTENT PARSING ──────────────────────────────────────
    let matchedLocation: string | undefined;
    let durationFilter: { lte?: number; gte?: number } | undefined;
    let priceOrder: 'asc' | 'desc' | undefined;

    // Detect Location (Prioritize exact matches found in the message)
    for (const loc of [...destList, ...regionList]) {
      if (lowerMsg.includes(loc)) {
        matchedLocation = loc;
        break;
      }
    }

    // Detect Duration
    let durationIntent: 'short' | 'regular' | 'extended' | undefined;
    if (lowerMsg.includes('weekend') || lowerMsg.includes('short')) {
      durationFilter = { lte: 4 };
      durationIntent = 'short';
    } else if (lowerMsg.includes('week') || lowerMsg.includes('long') || lowerMsg.includes('7')) {
      durationFilter = { gte: 6, lte: 8 };
      durationIntent = 'regular';
    } else if (lowerMsg.includes('extended')) {
      durationFilter = { gte: 9 };
      durationIntent = 'extended';
    }

    // Detect Budget / Quality
    if (lowerMsg.includes('cheap') || lowerMsg.includes('budget') || lowerMsg.includes('affordable')) {
      priceOrder = 'asc';
    } else if (lowerMsg.includes('luxury') || lowerMsg.includes('premium') || lowerMsg.includes('suite')) {
      priceOrder = 'desc';
    }

    // ─── 3. LOGICAL ORCHESTRATION ──────────────────────────────────────────
    const whereClause: any = {};
    if (matchedLocation) {
      whereClause.OR = [
        { destination: { contains: matchedLocation, mode: 'insensitive' } },
        { region: { name: { contains: matchedLocation, mode: 'insensitive' } } }
      ];
    }
    
    // Save location-only clause for fallback logic
    const locationOnlyClause = { ...whereClause };

    if (durationFilter) {
      whereClause.duration = durationFilter;
    }

    // Attempt Query with all filters
    let cruise = await prisma.cruise.findFirst({
      where: whereClause,
      include: { region: true },
      orderBy: priceOrder ? { basePrice: priceOrder } : { date: 'asc' },
    });

    let modifiedIntentMessage = "";

    // Step B: Fallback logic - If strict match failed but a location was provided,
    // find a cruise for that location regardless of duration and inform the user.
    if (!cruise && matchedLocation && durationFilter) {
      cruise = await prisma.cruise.findFirst({
        where: locationOnlyClause,
        include: { region: true },
        orderBy: priceOrder ? { basePrice: priceOrder } : { date: 'asc' },
      });

      if (cruise) {
        modifiedIntentMessage = `I found some excellent ${cruise.destination} voyages, though they are slightly longer than a typical ${durationIntent === 'short' ? 'weekend getaway' : 'short break'}. `;
      }
    }

    // ─── 4. FORMULATE RESPONSE ──────────────────────────────────────────────
    if (!cruise) {
       if (matchedLocation) {
         return NextResponse.json({
           aiMsg: `We don't currently have any scheduled voyages for "${matchedLocation.charAt(0).toUpperCase() + matchedLocation.slice(1)}". Would you like to explore our other tropical destinations?`,
           cruiseMatch: null
         });
       }
       return NextResponse.json({
         aiMsg: "I couldn't find a cruise that matches your requirements. Maybe try searching for a different destination or season?",
         cruiseMatch: null
       });
    }

    let responseText = modifiedIntentMessage || `I found a gorgeous ${cruise.duration}-Night cruise to ${cruise.destination}. `;
    if (priceOrder === 'asc') responseText += "It's one of our most affordable luxury options. ";
    if (priceOrder === 'desc') responseText += "This voyage features our premium luxury suites. ";
    responseText += "Let me navigate you to the listing now.";

    return NextResponse.json({
       aiMsg: responseText,
       cruiseMatch: {
         id: cruise.id,
         destination: cruise.destination,
       }
    });

  } catch (err: any) {
    console.error('[POST /api/chat]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
