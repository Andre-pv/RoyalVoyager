import { prisma } from '@/lib/prisma';

export async function getCruiseFilters() {
  const [sources, regions] = await Promise.all([
    prisma.cruise.findMany({
      select: { source: true },
      distinct: ['source'],
      where: { date: { gte: new Date() } },
      orderBy: { source: 'asc' },
    }),
    prisma.region.findMany({
      include: {
        cruises: {
          select: { destination: true },
          where: { date: { gte: new Date() } },
        },
      },
    }),
  ]);

  const ports = sources.map(s => s.source);

  const regionDestinations = regions.map(region => ({
    region: region.name,
    items: Array.from(new Set(region.cruises.map(c => c.destination))).sort(),
  }));

  return { ports, regions: regionDestinations };
}
