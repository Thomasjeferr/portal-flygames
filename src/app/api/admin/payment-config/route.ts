import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clearPaymentConfigCache } from '@/lib/payment-config';
import { z } from 'zod';

function maskValue(val: string | null): string {
  if (!val || val.length < 8) return val ? '••••••••' : '';
  return '••••••••' + val.slice(-4);
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const row = await prisma.paymentConfig.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!row) {
    return NextResponse.json({
      wooviApiKey: '',
      wooviWebhookSecret: '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
      stripePublishableKey: '',
      wooviConfigured: false,
      stripeConfigured: false,
    });
  }

  return NextResponse.json({
    wooviApiKey: maskValue(row.wooviApiKey),
    wooviWebhookSecret: maskValue(row.wooviWebhookSecret),
    stripeSecretKey: maskValue(row.stripeSecretKey),
    stripeWebhookSecret: maskValue(row.stripeWebhookSecret),
    stripePublishableKey: maskValue(row.stripePublishableKey),
    wooviConfigured: !!row.wooviApiKey,
    stripeConfigured: !!row.stripeSecretKey,
  });
}

const updateSchema = z.object({
  wooviApiKey: z.string().optional(),
  wooviWebhookSecret: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  stripePublishableKey: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.paymentConfig.findFirst({ orderBy: { createdAt: 'desc' } });

    const updateData: Record<string, string | null> = {};
    if (data.wooviApiKey !== undefined) updateData.wooviApiKey = data.wooviApiKey.trim() || null;
    if (data.wooviWebhookSecret !== undefined) updateData.wooviWebhookSecret = data.wooviWebhookSecret.trim() || null;
    if (data.stripeSecretKey !== undefined) updateData.stripeSecretKey = data.stripeSecretKey.trim() || null;
    if (data.stripeWebhookSecret !== undefined) updateData.stripeWebhookSecret = data.stripeWebhookSecret.trim() || null;
    if (data.stripePublishableKey !== undefined) updateData.stripePublishableKey = data.stripePublishableKey.trim() || null;

    let config;
    if (existing) {
      config = await prisma.paymentConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      config = await prisma.paymentConfig.create({
        data: {
          wooviApiKey: updateData.wooviApiKey ?? null,
          wooviWebhookSecret: updateData.wooviWebhookSecret ?? null,
          stripeSecretKey: updateData.stripeSecretKey ?? null,
          stripeWebhookSecret: updateData.stripeWebhookSecret ?? null,
          stripePublishableKey: updateData.stripePublishableKey ?? null,
        },
      });
    }

    clearPaymentConfigCache();

    return NextResponse.json({
      message: 'Credenciais salvas.',
      wooviConfigured: !!config.wooviApiKey,
      stripeConfigured: !!config.stripeSecretKey,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}
