import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { emailSettingsSchema } from '@/lib/validators/emailSchema';

function toBody(data: Record<string, unknown>) {
  return {
    from_name: data.from_name ?? 'Fly Games',
    from_email: data.from_email ?? 'no-reply@flygames.app',
    reply_to: data.reply_to ?? '',
    brand_color: data.brand_color ?? '#22c55e',
    logo_url: data.logo_url ?? '',
    support_email: data.support_email ?? '',
    whatsapp_url: data.whatsapp_url ?? '',
    footer_text: data.footer_text ?? '',
    app_base_url: data.app_base_url ?? '',
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const row = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (!row)
      return NextResponse.json({
        from_name: 'Fly Games',
        from_email: 'no-reply@flygames.app',
        reply_to: '',
        brand_color: '#22c55e',
        logo_url: '',
        support_email: '',
        whatsapp_url: '',
        footer_text: '',
        app_base_url: baseUrl,
      });
    return NextResponse.json({
      from_name: row.fromName,
      from_email: row.fromEmail,
      reply_to: row.replyTo ?? '',
      brand_color: row.brandColor,
      logo_url: row.logoUrl ?? '',
      support_email: row.supportEmail ?? '',
      whatsapp_url: row.whatsappUrl ?? '',
      footer_text: row.footerText ?? '',
      app_base_url: row.appBaseUrl ?? baseUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const raw = await request.json();
    const body = toBody(raw);
    const parsed = emailSettingsSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    const d = parsed.data;
    const existing = await prisma.emailSettings.findFirst();
    const data = {
      fromName: d.from_name,
      fromEmail: d.from_email,
      replyTo: d.reply_to?.trim() || null,
      brandColor: d.brand_color,
      logoUrl: d.logo_url?.trim() || null,
      supportEmail: d.support_email?.trim() || null,
      whatsappUrl: d.whatsapp_url?.trim() || null,
      footerText: d.footer_text?.trim() || null,
      appBaseUrl: d.app_base_url?.trim() || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    };
    if (existing) {
      await prisma.emailSettings.update({ where: { id: existing.id }, data });
    } else {
      await prisma.emailSettings.create({ data });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}
