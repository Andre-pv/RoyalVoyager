import { prisma } from '@/lib/prisma';
import SearchClient from './SearchClient';
import { getCruiseFilters } from '../actions/cruise';

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: { date?: string; source?: string; dest?: string };
}) {
  const { date, source, dest } = searchParams;
  const filters = await getCruiseFilters();

  let cruises: any[] = [];
  let recommendations: any[] = [];

  const filter: any = {};
  if (source && source !== 'Any Port') {
    filter.source = { contains: source.split(',')[0], mode: 'insensitive' };
  }
  
  if (dest && dest !== 'Where to wander?') {
    filter.OR = [
      { destination: { contains: dest, mode: 'insensitive' } },
      { region: { name: { contains: dest, mode: 'insensitive' } } }
    ];
  }

  // Robust Date Handling
  let searchDate: Date | null = null;
  if (date && date !== 'Any Date' && date !== 'Anytime') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      searchDate = parsed;
    }
  }

  if (searchDate) {
    // 1. Try to find cruises on exactly that date (or window of that day)
    const nextDay = new Date(searchDate);
    nextDay.setDate(searchDate.getDate() + 1);

    cruises = await prisma.cruise.findMany({
      where: {
        ...filter,
        date: { gte: searchDate, lt: nextDay }
      },
      include: { rooms: true, region: true },
      orderBy: { date: 'asc' },
    });

    // 2. If no exact match, find the NEXT AVAILABLE dates after the selected date
    if (cruises.length === 0) {
      const nextCruise = await prisma.cruise.findFirst({
        where: {
          ...filter,
          date: { gte: searchDate }
        },
        orderBy: { date: 'asc' },
        select: { date: true }
      });

      if (nextCruise) {
        const nextDayWindow = new Date(nextCruise.date);
        nextDayWindow.setHours(23, 59, 59, 999);
        
        recommendations = await prisma.cruise.findMany({
          where: {
            ...filter,
            date: { gte: nextCruise.date, lte: nextDayWindow }
          },
          include: { rooms: true, region: true },
          orderBy: { date: 'asc' },
        });
      }
    }
  } else {
    // 3. No specific date filter - show all future cruises
    cruises = await prisma.cruise.findMany({
      where: {
        ...filter,
        date: { gte: new Date() } // At least don't show things that are already gone
      },
      include: { rooms: true, region: true },
      orderBy: { date: 'asc' },
    });
  }

  return (
    <SearchClient 
      cruises={cruises} 
      recommendations={recommendations} 
      searchParams={searchParams} 
      filters={filters}
    />
  );
}

