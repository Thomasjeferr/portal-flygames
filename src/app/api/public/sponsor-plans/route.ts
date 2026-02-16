import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function toResponse(p: { benefits: unknown; featuresFlags: unknown } & Record<string, unknown>) {
  return {
    ...p,
    benefits: typeof p.benefits === 'string' ? JSON.parse(p.benefits || '[]') : p.benefits,
    featuresFlags: typeof p.featuresFlags === 'string' ? JSON.parse(p.featuresFlags || '{}') : p.featuresFlags,
  };
}

/** Lista planos de patrocínio ativos (público, sem auth). */
export async function GET() {
  try {
    const plans = await prisma.sponsorPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(plans.map(toResponse));
  } catch (e) {
    console.error('GET /api/public/sponsor-plans', e);
    return NextResponse.json([], { status: 200 });
  }
}
