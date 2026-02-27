import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || undefined;
  const typeFilter = searchParams.get('type') || 'all'; // all | responsible | common
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  if (typeFilter === 'responsible' || typeFilter === 'common') {
    const [managerRows, teamsWithResponsible] = await Promise.all([
      prisma.teamManager.findMany({ select: { userId: true } }),
      prisma.team.findMany({
        where: { approvalStatus: 'approved', responsibleEmail: { not: null } },
        select: { responsibleEmail: true },
      }),
    ]);
    const managerUserIds = new Set(managerRows.map((r) => r.userId));
    const responsibleEmails = new Set(
      teamsWithResponsible.map((t) => t.responsibleEmail!.trim().toLowerCase())
    );
    const responsibleUserIds = await prisma.user.findMany({
      where: { id: { in: Array.from(managerUserIds) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const byEmailUserIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT u.id FROM "User" u
      INNER JOIN "Team" t ON t.approval_status = 'approved'
        AND t.responsible_email IS NOT NULL
        AND LOWER(TRIM(t.responsible_email)) = LOWER(TRIM(u.email))
      WHERE NOT EXISTS (SELECT 1 FROM "team_managers" m WHERE m.user_id = u.id)
    `;
    const allResponsibleIds = new Set([
      ...responsibleUserIds.map((u) => u.id),
      ...byEmailUserIds.map((r) => r.id),
    ]);
    const orderedIds = await prisma.user.findMany({
      where: { id: { in: Array.from(allResponsibleIds) }, ...(where && { AND: [where] }) },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const idList = orderedIds.map((u) => u.id);
    const total = idList.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const pageIds = typeFilter === 'responsible' ? idList.slice(skip, skip + limit) : [];
    const commonWhere =
      typeFilter === 'common'
        ? { id: { notIn: Array.from(allResponsibleIds) }, ...(where && { AND: [where] }) }
        : where;

    if (typeFilter === 'common') {
      const [totalCommon, usersCommon] = await Promise.all([
        prisma.user.count({ where: commonWhere }),
        prisma.user.findMany({
          where: commonWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            subscription: true,
          },
        }),
      ]);
      const withFlags = await addResponsibleFlags(usersCommon);
      return NextResponse.json({
        users: withFlags,
        total: totalCommon,
        page,
        limit,
        totalPages: Math.ceil(totalCommon / limit) || 1,
      });
    }

    if (pageIds.length === 0) {
      return NextResponse.json({
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      });
    }
    const users = await prisma.user.findMany({
      where: { id: { in: pageIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
      },
    });
    const sorted = pageIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as typeof users;
    const withFlags = await addResponsibleFlags(sorted);
    return NextResponse.json({
      users: withFlags,
      total: idList.length,
      page,
      limit,
      totalPages,
    });
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
      },
    }),
  ]);

  const withFlags = await addResponsibleFlags(users);
  return NextResponse.json({
    users: withFlags,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

async function addResponsibleFlags(
  users: {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
    emailVerified: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    subscription: unknown;
  }[]
) {
  if (users.length === 0) return users.map((u) => ({ ...u, isTeamResponsible: false }));
  const userIds = users.map((u) => u.id);
  const [managers, responsibleEmailsRaw] = await Promise.all([
    prisma.teamManager.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true },
    }),
    prisma.team.findMany({
      where: { approvalStatus: 'approved', responsibleEmail: { not: null } },
      select: { responsibleEmail: true },
    }),
  ]);
  const managerSet = new Set(managers.map((m) => m.userId));
  const emailSet = new Set(
    responsibleEmailsRaw.map((t) => t.responsibleEmail!.trim().toLowerCase())
  );
  return users.map((u) => ({
    ...u,
    isTeamResponsible:
      managerSet.has(u.id) || emailSet.has((u.email ?? '').trim().toLowerCase()),
  }));
}
