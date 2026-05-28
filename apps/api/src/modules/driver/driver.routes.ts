import type { FastifyPluginAsync } from 'fastify';

import { DriverService } from './driver.service';
import { DriverReviewsQuery, UpdateVehicleBody } from './driver.schema';
import type { DriverKycDocumentType } from './driver.types';
import { success, error } from '../../utils/response';

type MultipartPart =
  | { type: 'field'; fieldname: string; value: unknown }
  | { type: 'file'; fieldname: string; toBuffer: () => Promise<Buffer> };

type MultipartRequest = {
  parts: () => AsyncIterable<MultipartPart>;
};

const driverRoutes: FastifyPluginAsync = async (app) => {
  const service = new DriverService(app.prisma, app.log, app);

  app.get('/driver/profile', { preHandler: [app.authenticateDriver] }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    return success(await service.getDriverProfile(driverId), 'Driver profile fetched');
  });

  app.patch('/driver/profile/vehicle', { preHandler: [app.authenticateDriver], schema: { body: UpdateVehicleBody } }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const body = request.body as { vehicleType: 'BIKE' | 'CAR' | 'VAN' | 'TRUCK'; vehiclePlate: string; vehicleModel: string };
    return success(await service.updateVehicleProfile(driverId, body), 'Vehicle profile updated');
  });

  app.patch('/driver/status', { preHandler: [app.authenticateDriver] }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const body = request.body as { isOnline: boolean; lat?: number; lng?: number };
    return success(await service.updateOnlineStatus(driverId, body.isOnline, body.lat, body.lng), 'Driver status updated');
  });

  app.patch('/driver/location', { preHandler: [app.authenticateDriver] }, async (request, reply) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const body = request.body as { lat: number; lng: number; heading?: number; speed?: number };
    await service.updateLocation(driverId, body.lat, body.lng, body.heading ?? 0, body.speed ?? 0);
    return reply.code(204).send();
  });

  app.post('/driver/kyc/verify-nin', { preHandler: [app.authenticateDriver] }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const body = request.body as { nin: string };
    const result = await service.submitKYCNIN(driverId, body.nin);
    return success(result, result.verified ? 'NIN verified' : result.message ?? 'NIN verification failed');
  });

  app.post('/driver/kyc/verify-bvn', { preHandler: [app.authenticateDriver] }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const body = request.body as { bvn: string };
    const result = await service.submitKYCBVN(driverId, body.bvn);
    return success(result, result.verified ? 'BVN verified' : result.message ?? 'BVN verification failed');
  });

  app.post('/driver/kyc/upload', { preHandler: [app.authenticateDriver] }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    let type: DriverKycDocumentType = 'license';
    let buffer: Buffer | null = null;

    for await (const part of (request as unknown as MultipartRequest).parts()) {
      if (part.type === 'field' && part.fieldname === 'type') {
        type = String(part.value) as DriverKycDocumentType;
      }

      if (part.type === 'file' && part.fieldname === 'file') {
        buffer = await part.toBuffer();
      }
    }

    if (!buffer) {
      return error('File required', 'VALIDATION_ERROR', [{ message: 'File required' }]);
    }

    return success(await service.uploadKYCDocument(driverId, buffer, type), 'Document uploaded');
  });

  app.post('/driver/kyc/submit', { preHandler: [app.authenticateDriver] }, async (request) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    return success(await service.submitKYC(driverId), 'KYC submitted');
  });

  app.get('/driver/:id/reviews', { schema: { querystring: DriverReviewsQuery } }, async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as { page?: number; limit?: number };
    return success(await service.getDriverReviews(id, query), 'Driver reviews fetched');
  });

  app.post('/admin/drivers/:id/approve-kyc', { preHandler: [app.authenticateAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    return success(await service.approveKYC(id), 'KYC approved');
  });

  app.post('/admin/drivers/:id/reject-kyc', { preHandler: [app.authenticateAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    return success(await service.rejectKYC(id, reason), 'KYC rejected');
  });
};

export default driverRoutes;
