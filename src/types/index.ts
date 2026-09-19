export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  currency?: string;
  createdAt?: string;
}

export interface SpendingTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  date: string; // YYYY-MM-DD
  category?: string;
  createdAt: number; // timestamp
  updatedAt?: number;
}

export type DebtType = 'to_give' | 'to_take';

export interface Person {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  notes?: string;
  balance: number; // Positive = They owe me (To Take); Negative = I owe them (To Give); 0 = Settled
  createdAt: number;
  updatedAt: number;
}

export type LedgerEntryType = 'give' | 'take' | 'settlement';

export interface LedgerEntry {
  id: string;
  personId: string;
  userId: string;
  amount: number; // positive value
  type: LedgerEntryType; // 'give' (I gave money), 'take' (I took money / they gave me), 'settlement' (Settle / repaid)
  direction: 'to_give' | 'to_take'; // which ledger this falls into
  reason: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export type TimeGrouping = 'all' | 'day' | 'month' | 'year';
export type NavigationTab = 'add' | 'history' | 'people' | 'reports';
