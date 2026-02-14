import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Criando usuários de teste ---\n');

  // 1. Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@portal.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { role: 'admin', passwordHash: adminHash, name: 'Administrador' },
    });
    console.log('Admin atualizado.');
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        passwordHash: adminHash,
        role: 'admin',
      },
    });
    console.log('Admin criado.');
  }

  // 2. Cliente teste (com assinatura ativa para ver a área logada e assistir)
  const clientEmail = process.env.CLIENT_EMAIL || 'cliente@teste.com';
  const clientPassword = process.env.CLIENT_PASSWORD || 'Cliente@123';
  const clientHash = await bcrypt.hash(clientPassword, 12);

  let clientUser = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        email: clientEmail,
        name: 'Cliente Teste',
        passwordHash: clientHash,
        role: 'user',
      },
    });
    console.log('Cliente teste criado.');
  } else {
    await prisma.user.update({
      where: { id: clientUser.id },
      data: { passwordHash: clientHash, name: 'Cliente Teste' },
    });
    console.log('Cliente teste atualizado.');
  }

  // Assinatura ativa para o cliente (1 mês a partir de hoje)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { userId: clientUser.id },
    create: { userId: clientUser.id, active: true, startDate, endDate },
    update: { active: true, startDate, endDate },
  });
  console.log('Assinatura ativa atribuída ao cliente teste.\n');

  console.log('========================================');
  console.log('  ADMIN');
  console.log('  E-mail: ' + adminEmail);
  console.log('  Senha:  ' + adminPassword);
  console.log('  Acesso: http://localhost:3000/admin/entrar');
  console.log('========================================');
  console.log('  CLIENTE TESTE');
  console.log('  E-mail: ' + clientEmail);
  console.log('  Senha:  ' + clientPassword);
  console.log('  Acesso: http://localhost:3000/entrar');
  console.log('  (Já com assinatura ativa para assistir vídeos)');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
