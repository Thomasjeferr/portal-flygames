import { prisma } from '@/lib/db';

const FORGOT_PASSWORD_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

export async function checkForgotPasswordRateLimit(ip: string, email: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const [ipEntry, emailEntry] = await Promise.all([
    prisma.rateLimit.findUnique({ where: { key: `forgot:ip:${ip}` } }),
    prisma.rateLimit.findUnique({ where: { key: `forgot:email:${email.toLowerCase()}` } }),
  ]);

  const checkEntry = (entry: { count: number; windowStart: Date } | null) => {
    if (!entry) return true;
    if (entry.windowStart < windowStart) return true; // janela expirou
    return entry.count < FORGOT_PASSWORD_LIMIT;
  };

  return checkEntry(ipEntry) && checkEntry(emailEntry);
}

export async function incrementForgotPasswordRateLimit(ip: string, email: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const upsert = async (key: string) => {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (!existing || existing.windowStart < windowStart) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
    } else {
      await prisma.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
    }
  };

  await Promise.all([
    upsert(`forgot:ip:${ip}`),
    upsert(`forgot:email:${email.toLowerCase()}`),
  ]);
}
