export type WalletTransactionType = 'CREDIT' | 'DEBIT';

export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export type WalletTransactionCategory =
  | 'TOP_UP'
  | 'ORDER_PAYMENT'
  | 'ORDER_EARNING'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'AIRTIME'
  | 'DATA'
  | 'ELECTRICITY'
  | 'COMMISSION'
  | 'REFUND';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  ledgerBalance: number;
  currency: 'NGN';
  nuban: string | null;
  bankName: string | null;
  bankCode?: string | null;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: WalletTransactionType;
  category: WalletTransactionCategory;
  status: WalletTransactionStatus;
  reference: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  debitWalletId: string;
  creditWalletId: string;
  amount: number;
  reference: string;
  description: string;
  createdAt: string;
}
