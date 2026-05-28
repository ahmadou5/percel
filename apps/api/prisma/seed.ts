import { PrismaClient, DriverStatus, DriverKYCStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@percel.app' },
    update: {},
    create: {
      email: 'admin@percel.app',
      phone: '+2348000000000',
      passwordHash: 'hashed-password-placeholder',
      fullName: 'Percel Admin',
      role: UserRole.ADMIN,
    },
  });

  const userA = await prisma.user.upsert({
    where: { email: 'user1@percel.app' },
    update: {},
    create: {
      email: 'user1@percel.app',
      phone: '+2348000000001',
      passwordHash: 'hashed-password-placeholder',
      fullName: 'Test User One',
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: 'user2@percel.app' },
    update: {},
    create: {
      email: 'user2@percel.app',
      phone: '+2348000000002',
      passwordHash: 'hashed-password-placeholder',
      fullName: 'Test User Two',
    },
  });

  await prisma.wallet.upsert({
    where: { userId: userA.id },
    update: {},
    create: { userId: userA.id },
  });

  await prisma.wallet.upsert({
    where: { userId: userB.id },
    update: {},
    create: { userId: userB.id },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver1@percel.app' },
    update: {},
    create: {
      email: 'driver1@percel.app',
      phone: '+2348000000003',
      passwordHash: 'hashed-password-placeholder',
      fullName: 'Test Driver One',
    },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      status: DriverStatus.ONLINE,
      isOnline: true,
    },
    create: {
      userId: driverUser.id,
      licenseNumber: 'DRV-LIC-0001',
      vehicleType: 'BIKE',
      vehiclePlate: 'KJA-001XY',
      vehicleModel: 'Bajaj Boxer',
      status: DriverStatus.ONLINE,
      isOnline: true,
    },
  });

  await prisma.driverKYC.upsert({
    where: { driverId: driver.id },
    update: {
      status: DriverKYCStatus.APPROVED,
    },
    create: {
      driverId: driver.id,
      ninNumber: '12345678901',
      bvnNumber: '12345678901',
      status: DriverKYCStatus.APPROVED,
    },
  });

  console.log({ adminId: admin.id, userAId: userA.id, userBId: userB.id, driverId: driver.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
