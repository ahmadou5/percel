import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying database...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const drivers = await prisma.driver.findMany({
    select: {
      id: true,
      userId: true,
      licenseNumber: true,
      vehicleType: true,
      vehiclePlate: true,
      vehicleModel: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log('--- LATEST USERS ---');
  console.log(JSON.stringify(users, null, 2));

  console.log('--- LATEST DRIVERS ---');
  console.log(JSON.stringify(drivers, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
