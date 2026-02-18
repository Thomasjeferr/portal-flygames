import { prisma } from '@/lib/db';

const FORGOT_PASSWORD_LIMIT = 5;
const LOGIN_LIMIT = 10;
const REGISTER_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 min
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hora

// Parceiros: cadastro por IP (evita spam, não trava quem envia 1–2 vezes)
const PARTNER_APPLY_LIMIT = 10;
const PARTNER_APPLY_WINDOW_MS = 60 * 60 * 1000; // 1 hora

// Verificação de e-mail (envio de código): por IP e por e-mail
const SEND_VERIFY_EMAIL_IP_LIMIT = 6;
const SEND_VERIFY_EMAIL_EMAIL_LIMIT = 4;
const SEND_VERIFY_EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hora

// Submissão do código de 6 dígitos (anti brute-force, usuário pode errar algumas vezes)
const VERIFY_EMAIL_LIMIT = 20;
const VERIFY_EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 min

// Reset de senha (token longo; limite evita abuso)
const RESET_PASSWORD_LIMIT = 10;
const RESET_PASSWORD_WINDOW_MS = 60 * 60 * 1000; // 1 hora

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const entry = await prisma.rateLimit.findUnique({ where: { key } });
  if (!entry) return true;
  if (entry.windowStart < windowStart) return true;
  return entry.count < limit;
}

async function incrementRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
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
}

export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`login:ip:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export async function incrementLoginRateLimit(ip: string): Promise<void> {
  return incrementRateLimit(`login:ip:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export async function checkRegisterRateLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`register:ip:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
}

export async function incrementRegisterRateLimit(ip: string): Promise<void> {
  return incrementRateLimit(`register:ip:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
}

export async function checkForgotPasswordRateLimit(ip: string, email: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const [ipEntry, emailEntry] = await Promise.all([
    prisma.rateLimit.findUnique({ where: { key: `forgot:ip:${ip}` } }),
    prisma.rateLimit.findUnique({ where: { key: `forgot:email:${email.toLowerCase()}` } }),
  ]);

  const checkEntry = (entry: { count: number; windowStart: Date } | null) => {
    if (!entry) return true;
    if (entry.windowStart < windowStart) return true;
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

export async function checkPartnerApplyRateLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`partner_apply:ip:${ip}`, PARTNER_APPLY_LIMIT, PARTNER_APPLY_WINDOW_MS);
}

export async function incrementPartnerApplyRateLimit(ip: string): Promise<void> {
  return incrementRateLimit(`partner_apply:ip:${ip}`, PARTNER_APPLY_LIMIT, PARTNER_APPLY_WINDOW_MS);
}

export async function checkSendVerifyEmailRateLimit(ip: string, email: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - SEND_VERIFY_EMAIL_WINDOW_MS);
  const [ipEntry, emailEntry] = await Promise.all([
    prisma.rateLimit.findUnique({ where: { key: `send_verify:ip:${ip}` } }),
    prisma.rateLimit.findUnique({ where: { key: `send_verify:email:${email.toLowerCase()}` } }),
  ]);
  const ok = (entry: { count: number; windowStart: Date } | null, limit: number) => {
    if (!entry) return true;
    if (entry.windowStart < windowStart) return true;
    return entry.count < limit;
  };
  return ok(ipEntry, SEND_VERIFY_EMAIL_IP_LIMIT) && ok(emailEntry, SEND_VERIFY_EMAIL_EMAIL_LIMIT);
}

export async function incrementSendVerifyEmailRateLimit(ip: string, email: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - SEND_VERIFY_EMAIL_WINDOW_MS);
  const upsert = async (key: string, limit: number) => {
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
    upsert(`send_verify:ip:${ip}`, SEND_VERIFY_EMAIL_IP_LIMIT),
    upsert(`send_verify:email:${email.toLowerCase()}`, SEND_VERIFY_EMAIL_EMAIL_LIMIT),
  ]);
}

export async function checkVerifyEmailRateLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`verify_email:ip:${ip}`, VERIFY_EMAIL_LIMIT, VERIFY_EMAIL_WINDOW_MS);
}

export async function incrementVerifyEmailRateLimit(ip: string): Promise<void> {
  return incrementRateLimit(`verify_email:ip:${ip}`, VERIFY_EMAIL_LIMIT, VERIFY_EMAIL_WINDOW_MS);
}

export async function checkResetPasswordRateLimit(ip: string): Promise<boolean> {
  return checkRateLimit(`reset_password:ip:${ip}`, RESET_PASSWORD_LIMIT, RESET_PASSWORD_WINDOW_MS);
}

export async function incrementResetPasswordRateLimit(ip: string): Promise<void> {
  return incrementRateLimit(`reset_password:ip:${ip}`, RESET_PASSWORD_LIMIT, RESET_PASSWORD_WINDOW_MS);
}
