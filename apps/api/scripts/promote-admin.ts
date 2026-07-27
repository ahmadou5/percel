import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const email = 'ahmadlasauwal@gmail.com';
  
  // 1. Check current user state
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found:', email);
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true, fullName: true, role: true } });
    console.log('All ADMIN users:', JSON.stringify(admins, null, 2));
    return;
  }
  
  console.log('Found user:', user.fullName, '| Role:', user.role, '| Status:', user.status);
  
  if (user.role !== 'ADMIN') {
    console.log('Promoting to ADMIN...');
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log('Done! User promoted to ADMIN.');
  } else {
    console.log('User already ADMIN. The token in the browser session may be stale.');
    console.log('Please log out and log back in to get a fresh ADMIN JWT.');
  }
  
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true, fullName: true } });
  console.log('All ADMINs:', JSON.stringify(admins, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
