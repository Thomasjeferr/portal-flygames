import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Criando usuários de teste ---\n');

  // 1. Admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@portal.com').toLowerCase();
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
  const clientEmail = (process.env.CLIENT_EMAIL || 'cliente@teste.com').toLowerCase();
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

  // 3. Responsável de time (para testar a Área do time)
  const timeEmail = (process.env.TIME_EMAIL || 'time@teste.com').toLowerCase();
  const timePassword = process.env.TIME_PASSWORD || 'Time@123';
  const timeHash = await bcrypt.hash(timePassword, 12);

  let timeUser = await prisma.user.findUnique({ where: { email: timeEmail } });
  if (!timeUser) {
    timeUser = await prisma.user.create({
      data: {
        email: timeEmail,
        name: 'Responsável Time Teste',
        passwordHash: timeHash,
        role: 'user',
      },
    });
    console.log('Usuário Área do time criado.');
  } else {
    await prisma.user.update({
      where: { id: timeUser.id },
      data: { passwordHash: timeHash, name: 'Responsável Time Teste' },
    });
    console.log('Usuário Área do time atualizado.');
  }

  // Time aprovado vinculado ao usuário de teste (para ver painel, comissões e elenco)
  let team = await prisma.team.findFirst({
    where: { slug: 'time-teste-fly' },
    include: { managers: { where: { userId: timeUser.id } } },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Time Teste Fly',
        shortName: 'TTF',
        slug: 'time-teste-fly',
        city: 'Porto Alegre',
        state: 'RS',
        foundedYear: 2000,
        description: 'Time de teste para Área do time.',
        responsibleName: 'Responsável Time Teste',
        responsibleEmail: timeEmail,
        isActive: true,
        approvalStatus: 'approved',
      },
    });
    console.log('Time de teste criado.');
  }
  const alreadyManager = await prisma.teamManager.findUnique({
    where: { userId_teamId: { userId: timeUser.id, teamId: team.id } },
  });
  if (!alreadyManager) {
    await prisma.teamManager.create({
      data: { userId: timeUser.id, teamId: team.id, role: 'OWNER' },
    });
    console.log('Vínculo responsável ↔ time criado.');
  }

  // 4. Usuário vinculado ao time SUCATAS NOGUEIRA (para acessar a Área do time desse time aprovado)
  const sucatasEmail = (process.env.SUCATAS_EMAIL || 'sucatas@teste.com').toLowerCase();
  const sucatasPassword = process.env.SUCATAS_PASSWORD || 'Sucatas@123';
  const sucatasHash = await bcrypt.hash(sucatasPassword, 12);

  let sucatasUser = await prisma.user.findUnique({ where: { email: sucatasEmail } });
  if (!sucatasUser) {
    sucatasUser = await prisma.user.create({
      data: {
        email: sucatasEmail,
        name: 'Responsável Sucatas Nogueira',
        passwordHash: sucatasHash,
        role: 'user',
      },
    });
    console.log('Usuário Sucatas Nogueira criado.');
  } else {
    await prisma.user.update({
      where: { id: sucatasUser.id },
      data: { passwordHash: sucatasHash, name: 'Responsável Sucatas Nogueira' },
    });
    console.log('Usuário Sucatas Nogueira atualizado.');
  }

  const sucatasTeam = await prisma.team.findFirst({
    where: {
      OR: [
        { name: 'SUCATAS NOGUEIRA' },
        { slug: 'sucatas-nogueira' },
        { slug: { startsWith: 'sucatas-nogueira' } },
      ],
    },
  });
  if (sucatasTeam) {
    const alreadySucatasManager = await prisma.teamManager.findUnique({
      where: { userId_teamId: { userId: sucatasUser.id, teamId: sucatasTeam.id } },
    });
    if (!alreadySucatasManager) {
      await prisma.teamManager.create({
        data: { userId: sucatasUser.id, teamId: sucatasTeam.id, role: 'OWNER' },
      });
      console.log('Vínculo usuário ↔ Sucatas Nogueira criado.');
    }
  } else {
    console.log('Time "SUCATAS NOGUEIRA" não encontrado. Cadastre o time e rode o seed de novo para vincular.');
  }

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
  console.log('========================================');
  console.log('  ÁREA DO TIME (responsável de time)');
  console.log('  E-mail: ' + timeEmail);
  console.log('  Senha:  ' + timePassword);
  console.log('  Acesso: http://localhost:3000/entrar → depois "Área do time"');
  console.log('  Ou: http://localhost:3000/painel-time');
  console.log('========================================');
  console.log('  SUCATAS NOGUEIRA (time aprovado – ver painel desse time)');
  console.log('  E-mail: ' + sucatasEmail);
  console.log('  Senha:  ' + sucatasPassword);
  console.log('  Acesso: http://localhost:3000/entrar → "Área do time"');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
