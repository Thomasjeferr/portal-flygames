import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const [user, subscription, teamManagerCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true, emailVerified: true },
    }),
    prisma.subscription.findUnique({ where: { userId: session.userId } }),
    prisma.teamManager.count({ where: { userId: session.userId } }),
  ]);

  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  const subscriptionActive =
    !!subscription?.active && subscription.endDate >= new Date();
  const isTeamManager = teamManagerCount > 0;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    },
    subscription: {
      active: subscriptionActive,
      endDate: subscription?.endDate?.toISOString() ?? null,
    },
    isTeamManager,
  });
}
