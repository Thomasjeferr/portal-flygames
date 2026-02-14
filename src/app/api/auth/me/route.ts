import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  const subscriptionActive =
    !!subscription?.active && subscription.endDate >= new Date();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    subscription: {
      active: subscriptionActive,
      endDate: subscription?.endDate?.toISOString() ?? null,
    },
  });
}
