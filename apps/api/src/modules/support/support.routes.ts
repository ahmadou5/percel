import type { FastifyPluginAsync } from 'fastify';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { SupportService } from './support.service.js';
import { success } from '../../utils/response.js';

export const supportRoutes: FastifyPluginAsync = async (app) => {
  const service = new SupportService(app.prisma);

  // Authenticated user/driver endpoints
  app.post('/support/tickets', {
    onRequest: [app.authenticate],
  }, async (request) => {
    const userId = (request.user as { sub: string }).sub;
    const body = request.body as {
      orderId?: string;
      category: TicketCategory;
      subject: string;
      description: string;
      priority?: TicketPriority;
      refundRequested?: boolean;
      refundAmount?: number;
      userRole?: 'USER' | 'DRIVER';
    };

    const role = body.userRole ?? 'USER';
    const ticket = await service.createTicket(userId, role, body);
    return success(ticket, 'Support ticket created successfully');
  });

  app.get('/support/tickets', {
    onRequest: [app.authenticate],
  }, async (request) => {
    const userId = (request.user as { sub: string }).sub;
    const tickets = await service.getUserTickets(userId);
    return success(tickets, 'Support tickets retrieved');
  });

  app.get('/support/tickets/:id', {
    onRequest: [app.authenticate],
  }, async (request) => {
    const userId = (request.user as { sub: string }).sub;
    const { id } = request.params as { id: string };
    const ticket = await service.getTicketDetails(userId, id);
    return success(ticket, 'Support ticket details retrieved');
  });

  app.post('/support/tickets/:id/messages', {
    onRequest: [app.authenticate],
  }, async (request) => {
    const userId = (request.user as { sub: string }).sub;
    const { id } = request.params as { id: string };
    const body = request.body as { text: string; senderName?: string; senderRole?: string };
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    const userName = body.senderName ?? user?.fullName ?? 'User';
    const userRole = body.senderRole ?? (user?.role === 'ADMIN' ? 'ADMIN' : 'USER');

    const message = await service.addMessage(userId, userName, userRole, id, body.text);
    return success(message, 'Message added to support ticket');
  });
};
