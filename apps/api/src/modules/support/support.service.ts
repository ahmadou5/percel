import crypto from 'node:crypto';
import type { PrismaClient, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { AppError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { cleanText } from '../../utils/sanitize.js';

function makeTicketNumber() {
  return `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export class SupportService {
  constructor(private readonly prisma: PrismaClient) {}

  async createTicket(userId: string, userRole: 'USER' | 'DRIVER', data: {
    orderId?: string;
    category: TicketCategory;
    subject: string;
    description: string;
    priority?: TicketPriority;
    refundRequested?: boolean;
    refundAmount?: number;
  }) {
    const subject = cleanText(data.subject);
    const description = cleanText(data.description);
    if (!subject || !description) {
      throw new ValidationError('Subject and description are required');
    }

    if (data.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
      if (!order) throw new NotFoundError('Associated order not found');
    }

    const ticketNumber = makeTicketNumber();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        userRole,
        orderId: data.orderId ?? null,
        category: data.category ?? 'OTHER',
        subject,
        description,
        priority: data.priority ?? 'MEDIUM',
        refundRequested: data.refundRequested ?? false,
        refundAmount: data.refundAmount ?? null,
        status: 'OPEN',
        messages: {
          create: {
            senderId: userId,
            senderName: userRole === 'DRIVER' ? 'Driver' : 'Customer',
            senderRole: userRole,
            text: description,
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        order: { select: { trackingCode: true, price: true, status: true } },
      },
    });

    return ticket;
  }

  async getUserTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        order: { select: { trackingCode: true, price: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTicketDetails(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        order: { select: { trackingCode: true, price: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundError('Support ticket not found');
    return ticket;
  }

  async addMessage(userId: string, userName: string, userRole: string, ticketId: string, text: string) {
    const clean = cleanText(text);
    if (!clean) throw new ValidationError('Message text cannot be empty');

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Support ticket not found');

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        text: clean,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date(), status: ticket.status === 'CLOSED' ? 'REOPENED' as any : ticket.status },
    });

    return message;
  }

  // Admin Methods
  async getAllTicketsForAdmin() {
    const tickets = await this.prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, role: true } },
        order: { select: { id: true, trackingCode: true, price: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      orderId: t.orderId ?? '',
      trackingCode: t.order?.trackingCode ?? t.ticketNumber,
      orderValue: t.order ? `₦${Number(t.order.price).toLocaleString()}` : 'N/A',
      rawOrderValue: t.order ? Number(t.order.price) : 0,
      customerName: t.user.fullName,
      customerId: t.user.id,
      customerPhone: t.user.phone ?? '',
      driverName: 'Assigned Driver',
      driverId: null,
      driverPhone: '',
      reason: t.description,
      subject: t.subject,
      category: t.category,
      status: t.status,
      openedAt: t.createdAt.toISOString(),
      openedMinutesAgo: Math.round((Date.now() - t.createdAt.getTime()) / 60000),
      chatMessages: t.messages.map((m) => ({
        sender: m.senderName,
        senderId: m.senderId,
        role: m.senderRole,
        text: m.text,
        at: m.createdAt.toISOString(),
      })),
      evidence: [],
      customerPriorDisputes: 0,
      driverPriorDisputes: 0,
      assignedTo: 'Support Admin',
    }));
  }

  async updateTicketStatusByAdmin(ticketId: string, status: TicketStatus, resolutionNote?: string) {
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        resolutionNote: resolutionNote ? cleanText(resolutionNote) : undefined,
      },
    });
    return updated;
  }
}
