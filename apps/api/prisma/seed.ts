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

  // Seed Hubs
  const seedHubs = [
    {
      id: 'hub-lagos-ojuelegba',
      name: 'Ojuelegba Hub',
      city: 'Lagos',
      state: 'Lagos',
      address: '14 Ojuelegba Rd, Surulere, Lagos',
      lat: 6.5046,
      lng: 3.3754,
      type: 'office',
      contactPhone: '+2348012345678',
      isActive: true,
    },
    {
      id: 'hub-abuja-utako',
      name: 'Utako Hub',
      city: 'Abuja',
      state: 'FCT',
      address: 'Plot 112, Utako District, Abuja',
      lat: 9.0852,
      lng: 7.3986,
      type: 'agent',
      contactPhone: '+2348012345679',
      isActive: true,
    },
    {
      id: 'hub-ph-gra',
      name: 'GRA Hub',
      city: 'Port Harcourt',
      state: 'Rivers',
      address: '34 Stadium Rd, GRA Phase 2, Port Harcourt',
      lat: 4.8156,
      lng: 7.0498,
      type: 'partner_park',
      contactPhone: '+2348012345680',
      isActive: true,
    },
    {
      id: 'hub-kano-gyadi-gyadi',
      name: 'Gyadi Gyadi Hub',
      city: 'Kano',
      state: 'Kano',
      address: '23 Maiduguri Rd, Gyadi Gyadi, Kano',
      lat: 12.0022,
      lng: 8.521,
      type: 'office',
      contactPhone: '+2348012345681',
      isActive: true,
    },
    {
      id: 'hub-ibadan-ring-road',
      name: 'Ring Road Hub',
      city: 'Ibadan',
      state: 'Oyo',
      address: '86 Ring Rd, Ibadan',
      lat: 7.3775,
      lng: 3.947,
      type: 'partner_park',
      contactPhone: '+2348012345682',
      isActive: true,
    },
  ];

  for (const h of seedHubs) {
    await prisma.hub.upsert({
      where: { id: h.id },
      update: {
        name: h.name,
        city: h.city,
        state: h.state,
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        type: h.type,
        contactPhone: h.contactPhone,
        isActive: h.isActive,
      },
      create: {
        id: h.id,
        name: h.name,
        city: h.city,
        state: h.state,
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        type: h.type,
        contactPhone: h.contactPhone,
        isActive: h.isActive,
      },
    });
  }

  // Seed Routes
  const seedRoutes = [
    { id: 'route-lagos-abuja', originHubId: 'hub-lagos-ojuelegba', destinationHubId: 'hub-abuja-utako', baseFare: 4500, estimatedDays: 2, isActive: true },
    { id: 'route-lagos-ibadan', originHubId: 'hub-lagos-ojuelegba', destinationHubId: 'hub-ibadan-ring-road', baseFare: 1800, estimatedDays: 1, isActive: true },
    { id: 'route-abuja-port-harcourt', originHubId: 'hub-abuja-utako', destinationHubId: 'hub-ph-gra', baseFare: 5200, estimatedDays: 3, isActive: true },
    { id: 'route-kano-abuja', originHubId: 'hub-kano-gyadi-gyadi', destinationHubId: 'hub-abuja-utako', baseFare: 4800, estimatedDays: 2, isActive: true },
    { id: 'route-ph-ibadan', originHubId: 'hub-ph-gra', destinationHubId: 'hub-ibadan-ring-road', baseFare: 5600, estimatedDays: 3, isActive: true },
  ];

  for (const r of seedRoutes) {
    await prisma.route.upsert({
      where: { originHubId_destinationHubId: { originHubId: r.originHubId, destinationHubId: r.destinationHubId } },
      update: {
        baseFare: r.baseFare,
        estimatedDays: r.estimatedDays,
        isActive: r.isActive,
      },
      create: {
        id: r.id,
        originHubId: r.originHubId,
        destinationHubId: r.destinationHubId,
        baseFare: r.baseFare,
        estimatedDays: r.estimatedDays,
        isActive: r.isActive,
      },
    });
  }

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

