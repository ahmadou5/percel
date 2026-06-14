import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.driver.findMany();
  for (const driver of drivers) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: 'ACTIVE' },
    });
    const kyc = await prisma.driverKYC.findUnique({ where: { driverId: driver.id } });
    if (kyc) {
      await prisma.driverKYC.update({
        where: { id: kyc.id },
        data: { status: 'APPROVED' },
      });
    } else {
      await prisma.driverKYC.create({
        data: {
          driverId: driver.id,
          ninNumber: '12345678901',
          bvnNumber: '12345678901',
          status: 'APPROVED',
        }
      });
    }
  }
  console.log(`Activated ${drivers.length} drivers`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
