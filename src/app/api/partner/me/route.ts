import { NextResponse } from 'next/server';
import { getApprovedPartner } from '@/lib/partnerAuth';

/** Dados do parceiro logado (apenas aprovado). Sem valores de faturamento. */
export async function GET() {
  const partner = await getApprovedPartner();
  if (!partner) {
    return NextResponse.json({ error: 'Acesso apenas para parceiros aprovados' }, { status: 403 });
  }
  return NextResponse.json({
    id: partner.id,
    name: partner.name,
    refCode: partner.refCode,
    planCommissionPercent: partner.planCommissionPercent,
    gameCommissionPercent: partner.gameCommissionPercent,
    sponsorCommissionPercent: partner.sponsorCommissionPercent,
  });
}
