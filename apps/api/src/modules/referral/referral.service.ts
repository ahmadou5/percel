import crypto from 'node:crypto';

import {
  NotificationType as PrismaNotificationType,
  Prisma,
  type PrismaClient,
  WalletTransactionCategory,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { deleteCache } from '../../lib/cache.js';
import { emitToUser } from '../../lib/realtime.js';
import { addNotificationJob } from '../../queues/index.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const PLATFORM_WALLET_ID = '00000000-0000-0000-0000-000000000001';

/** Bonus amounts (NGN). Can be moved to env/config in the future. */
const INVITER_BONUS = 500;
const INVITEE_BONUS = 200;

/** Generate a short, unique referral code from a user id + random suffix. */
function generateReferralCode(userId: string): string {
  const hash = crypto.createHash('sha256').update(userId + Date.now().toString()).digest('hex');
  return hash.slice(0, 6).toUpperCase();
}

export class ReferralService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger,
    private readonly app: FastifyInstance,
  ) {}

  private async createNotification(
    userId: string,
    type: PrismaNotificationType,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as Prisma.InputJsonValue,
        read: false,
      },
    });
  }

  /**
   * Return the current user's referral code (generates one if missing).
   */
  async getMyReferralCode(userId: string): Promise<{ code: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });
    if (!user) throw new NotFoundError('User not found');

    if (user.referralCode) return { code: user.referralCode };

    // Generate and persist a unique code
    let code = generateReferralCode(userId);
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!existing) break;
      code = generateReferralCode(userId + attempts.toString());
      attempts++;
    }

    await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
    return { code };
  }

  /**
   * Apply a referral code during or after registration.
   * Links the invitee to the inviter and creates a PENDING referral.
   */
  async applyReferralCode(inviteeId: string, code: string): Promise<{ applied: boolean; inviterName: string }> {
    const normalizedCode = code.trim().toUpperCase();

    // Validate the code belongs to a real user
    const inviter = await this.prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: { id: true, fullName: true },
    });

    if (!inviter) throw new NotFoundError('Invalid referral code');
    if (inviter.id === inviteeId) throw new ValidationError('You cannot use your own referral code');

    // Check the invitee hasn't already been referred
    const existingReferral = await this.prisma.referral.findUnique({ where: { inviteeId } });
    if (existingReferral) throw new ValidationError('You have already applied a referral code');

    // Check the invitee didn't already set a referrer
    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeId },
      select: { referredById: true },
    });
    if (invitee?.referredById) throw new ValidationError('Referral code already applied');

    await this.prisma.$transaction(async (trx) => {
      await trx.user.update({
        where: { id: inviteeId },
        data: { referredById: inviter.id },
      });

      await trx.referral.create({
        data: {
          inviterId: inviter.id,
          inviteeId,
          status: 'PENDING',
        },
      });
    });

    this.logger.info({ inviteeId, inviterId: inviter.id, code: normalizedCode }, 'referral.applied');

    // Notify the inviter
    await this.createNotification(
      inviter.id,
      PrismaNotificationType.PROMO,
      'New referral!',
      'Someone used your referral code. Complete their first order to unlock rewards!',
      { inviteeId },
    );

    return { applied: true, inviterName: inviter.fullName };
  }

  /**
   * Get referral stats for a user (dashboard data).
   */
  async getReferralStats(userId: string) {
    const [user, referrals, totalEarned] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, referredById: true },
      }),
      this.prisma.referral.findMany({
        where: { inviterId: userId },
        select: {
          id: true,
          status: true,
          inviterBonus: true,
          createdAt: true,
          invitee: {
            select: { fullName: true, avatarUrl: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.referral.aggregate({
        where: { inviterId: userId, status: 'REWARDED' },
        _sum: { inviterBonus: true },
      }),
    ]);

    if (!user) throw new NotFoundError('User not found');

    // Ensure referral code exists
    let code = user.referralCode;
    if (!code) {
      const result = await this.getMyReferralCode(userId);
      code = result.code;
    }

    const pending = referrals.filter((r) => r.status === 'PENDING').length;
    const qualified = referrals.filter((r) => r.status === 'QUALIFIED').length;
    const rewarded = referrals.filter((r) => r.status === 'REWARDED').length;

    const unclaimedBonus = referrals
      .filter((r) => r.status === 'QUALIFIED')
      .reduce((sum, r) => sum + Number(r.inviterBonus || INVITER_BONUS), 0);

    return {
      code,
      totalReferred: referrals.length,
      pending,
      qualified,
      rewarded,
      unclaimedBonus,
      totalEarned: Number(totalEarned._sum.inviterBonus ?? 0),
      inviterBonus: INVITER_BONUS,
      inviteeBonus: INVITEE_BONUS,
      referrals: referrals.map((r) => ({
        id: r.id,
        status: r.status,
        bonus: Number(r.inviterBonus),
        inviteeName: r.invitee.fullName,
        inviteeAvatar: r.invitee.avatarUrl,
        joinedAt: r.invitee.createdAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Claim all QUALIFIED referral rewards into user's main wallet.
   */
  async claimReferralRewards(userId: string): Promise<{ claimedAmount: number; count: number }> {
    const qualifiedReferrals = await this.prisma.referral.findMany({
      where: { inviterId: userId, status: 'QUALIFIED' },
    });

    if (qualifiedReferrals.length === 0) {
      return { claimedAmount: 0, count: 0 };
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const totalClaiming = qualifiedReferrals.reduce((sum, r) => sum + Number(r.inviterBonus || INVITER_BONUS), 0);
    const now = new Date();
    const claimRef = `REF_CLAIM_${Date.now()}_${userId.slice(0, 6)}`;

    await this.prisma.$transaction(async (trx) => {
      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + totalClaiming;

      await trx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter, ledgerBalance: balanceAfter },
      });

      await trx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: totalClaiming,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.REFERRAL_BONUS,
          status: WalletTransactionStatus.COMPLETED,
          reference: claimRef,
          description: `Referral reward claimed (${qualifiedReferrals.length} invitees)`,
          metadata: { referralCount: qualifiedReferrals.length },
          balanceBefore,
          balanceAfter,
        },
      });

      await trx.referral.updateMany({
        where: { id: { in: qualifiedReferrals.map((r) => r.id) } },
        data: { status: 'REWARDED', rewardedAt: now },
      });
    });

    await deleteCache(this.app.redis, [`cache:wallet:balance:${wallet.id}`]);

    return { claimedAmount: totalClaiming, count: qualifiedReferrals.length };
  }

  /**
   * Called when an invitee completes their first order.
   * Transitions referral from PENDING → QUALIFIED and pays bonuses.
   */
  async qualifyReferral(inviteeId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { inviteeId },
      include: {
        inviter: { select: { id: true, fullName: true, wallet: { select: { id: true, balance: true } } } },
        invitee: { select: { id: true, fullName: true, wallet: { select: { id: true, balance: true } } } },
      },
    });

    if (!referral) return; // No referral linked
    if (referral.status !== 'PENDING') return; // Already processed

    const inviterWallet = referral.inviter.wallet;
    const inviteeWallet = referral.invitee.wallet;

    if (!inviterWallet || !inviteeWallet) {
      this.logger.warn({ referralId: referral.id }, 'referral.qualify.missing_wallet');
      return;
    }

    const now = new Date();
    const inviterRef = `REF_BONUS_${Date.now()}_${referral.inviterId.slice(0, 6)}`;
    const inviteeRef = `REF_WELCOME_${Date.now()}_${referral.inviteeId.slice(0, 6)}`;

    await this.prisma.$transaction(async (trx) => {
      // Credit inviter
      const inviterBefore = Number(inviterWallet.balance);
      const inviterAfter = inviterBefore + INVITER_BONUS;
      await trx.wallet.update({ where: { id: inviterWallet.id }, data: { balance: inviterAfter, ledgerBalance: inviterAfter } });
      await trx.walletTransaction.create({
        data: {
          walletId: inviterWallet.id,
          amount: INVITER_BONUS,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.REFERRAL_BONUS,
          status: WalletTransactionStatus.COMPLETED,
          reference: inviterRef,
          description: `Referral bonus – ${referral.invitee.fullName} completed first order`,
          metadata: { referralId: referral.id, inviteeId: referral.inviteeId },
          balanceBefore: inviterBefore,
          balanceAfter: inviterAfter,
        },
      });

      // Credit invitee
      const inviteeBefore = Number(inviteeWallet.balance);
      const inviteeAfter = inviteeBefore + INVITEE_BONUS;
      await trx.wallet.update({ where: { id: inviteeWallet.id }, data: { balance: inviteeAfter, ledgerBalance: inviteeAfter } });
      await trx.walletTransaction.create({
        data: {
          walletId: inviteeWallet.id,
          amount: INVITEE_BONUS,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.REFERRAL_BONUS,
          status: WalletTransactionStatus.COMPLETED,
          reference: inviteeRef,
          description: `Welcome bonus – referred by ${referral.inviter.fullName}`,
          metadata: { referralId: referral.id, inviterId: referral.inviterId },
          balanceBefore: inviteeBefore,
          balanceAfter: inviteeAfter,
        },
      });

      // Ledger entries
      await trx.ledgerEntry.create({
        data: {
          debitWalletId: PLATFORM_WALLET_ID,
          creditWalletId: inviterWallet.id,
          amount: INVITER_BONUS,
          reference: `LEDGER_${inviterRef}`,
          description: 'Referral inviter bonus',
        },
      });
      await trx.ledgerEntry.create({
        data: {
          debitWalletId: PLATFORM_WALLET_ID,
          creditWalletId: inviteeWallet.id,
          amount: INVITEE_BONUS,
          reference: `LEDGER_${inviteeRef}`,
          description: 'Referral invitee welcome bonus',
        },
      });

      // Update referral status
      await trx.referral.update({
        where: { id: referral.id },
        data: {
          status: 'REWARDED',
          inviterBonus: INVITER_BONUS,
          inviteeBonus: INVITEE_BONUS,
          qualifiedAt: now,
          rewardedAt: now,
        },
      });
    });

    // Bust balance caches
    await deleteCache(this.app.redis, [
      `cache:wallet:balance:${inviterWallet.id}`,
      `cache:wallet:balance:${inviteeWallet.id}`,
    ]);

    // Emit realtime events
    try {
      emitToUser(this.app, referral.inviterId, 'wallet_updated', { walletId: inviterWallet.id });
      emitToUser(this.app, referral.inviteeId, 'wallet_updated', { walletId: inviteeWallet.id });
    } catch (err) {
      this.logger.warn({ err }, 'referral.qualify.emit_failed');
    }

    // Notifications
    const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

    await Promise.all([
      addNotificationJob(this.app, referral.inviterId, 'REFERRAL_BONUS', {
        amount: INVITER_BONUS,
        reference: inviterRef,
        kind: 'referral_inviter_bonus',
      }),
      this.createNotification(
        referral.inviterId,
        PrismaNotificationType.PAYMENT,
        'Referral reward earned!',
        `${fmt.format(INVITER_BONUS)} added to your wallet. ${referral.invitee.fullName} completed their first order.`,
        { amount: INVITER_BONUS, reference: inviterRef, kind: 'referral_inviter_bonus' },
      ),
      this.createNotification(
        referral.inviteeId,
        PrismaNotificationType.PAYMENT,
        'Welcome bonus!',
        `${fmt.format(INVITEE_BONUS)} added to your wallet as a sign-up bonus.`,
        { amount: INVITEE_BONUS, reference: inviteeRef, kind: 'referral_invitee_bonus' },
      ),
    ]);

    this.logger.info(
      { referralId: referral.id, inviterId: referral.inviterId, inviteeId: referral.inviteeId },
      'referral.qualified_and_rewarded',
    );
  }
}
