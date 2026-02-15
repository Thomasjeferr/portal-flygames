import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { regenerateClubViewerPassword } from '@/services/club-viewer.service';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const slotId = (await params).slotId;
  if (!slotId) {
    return NextResponse.json({ error: 'Slot não informado' }, { status: 400 });
  }
  const result = await regenerateClubViewerPassword(slotId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ password: result.password });
}
