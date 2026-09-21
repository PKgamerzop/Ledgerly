import { SpendingTransaction, TransactionType, Person, LedgerEntry, LedgerEntryType } from '../types';
import { markLocalEdit } from '../services/googleDriveSync';

// Event emitter helper for local reactive updates across views & tabs
const DEMO_TX_KEY = 'ledgerly_demo_transactions';
const DEMO_PEOPLE_KEY = 'ledgerly_demo_people';
const DEMO_ENTRIES_PREFIX = 'ledgerly_demo_entries_';

export const DATA_CHANGE_EVENT = 'ledgerly_data_change';
export const LOCAL_EDIT_EVENT = 'ledgerly_local_edit';
export const REMOTE_DATA_EVENT = 'ledgerly_remote_data_imported';
export const DEMO_CHANGE_EVENT = 'ledgerly_demo_data_change';

// Tombstones keys
const DELETED_TX_KEY_PREFIX = 'ledgerly_deleted_tx_';
const DELETED_PEOPLE_KEY_PREFIX = 'ledgerly_deleted_people_';
const DELETED_ENTRIES_KEY_PREFIX = 'ledgerly_deleted_entries_';

export function getDeletedTxIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${DELETED_TX_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedTxId(userId: string, txId: string): void {
  const current = getDeletedTxIds(userId);
  if (!current.includes(txId)) {
    current.push(txId);
    if (current.length > 500) current.shift();
    localStorage.setItem(`${DELETED_TX_KEY_PREFIX}${userId}`, JSON.stringify(current));
  }
}

export function saveDeletedTxIds(userId: string, ids: string[]): void {
  const set = new Set([...getDeletedTxIds(userId), ...ids]);
  localStorage.setItem(`${DELETED_TX_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(set).slice(-500)));
}

export function getDeletedPersonIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${DELETED_PEOPLE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedPersonId(userId: string, personId: string): void {
  const current = getDeletedPersonIds(userId);
  if (!current.includes(personId)) {
    current.push(personId);
    if (current.length > 200) current.shift();
    localStorage.setItem(`${DELETED_PEOPLE_KEY_PREFIX}${userId}`, JSON.stringify(current));
  }
}

export function saveDeletedPersonIds(userId: string, ids: string[]): void {
  const set = new Set([...getDeletedPersonIds(userId), ...ids]);
  localStorage.setItem(`${DELETED_PEOPLE_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(set).slice(-200)));
}

export function getDeletedEntryIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${DELETED_ENTRIES_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedEntryId(userId: string, entryId: string): void {
  const current = getDeletedEntryIds(userId);
  if (!current.includes(entryId)) {
    current.push(entryId);
    if (current.length > 500) current.shift();
    localStorage.setItem(`${DELETED_ENTRIES_KEY_PREFIX}${userId}`, JSON.stringify(current));
  }
}

export function saveDeletedEntryIds(userId: string, ids: string[]): void {
  const set = new Set([...getDeletedEntryIds(userId), ...ids]);
  localStorage.setItem(`${DELETED_ENTRIES_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(set).slice(-500)));
}

function notifyDataChange(isLocal = true) {
  if (isLocal) {
    markLocalEdit();
    window.dispatchEvent(new CustomEvent(LOCAL_EDIT_EVENT));
  }
  window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  window.dispatchEvent(new CustomEvent(DEMO_CHANGE_EVENT));
}

function getTxKey(userId: string): string {
  if (userId.startsWith('demo-')) return DEMO_TX_KEY;
  return `ledgerly_tx_${userId}`;
}

function getPeopleKey(userId: string): string {
  if (userId.startsWith('demo-')) return DEMO_PEOPLE_KEY;
  return `ledgerly_people_${userId}`;
}

function getEntriesKey(userId: string, personId: string): string {
  if (userId.startsWith('demo-')) return `${DEMO_ENTRIES_PREFIX}${personId}`;
  return `ledgerly_entries_${userId}_${personId}`;
}

// Initial sample seed data for demo mode
function getInitialDemoTransactions(): SpendingTransaction[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  return [
    {
      id: 'demo-tx-1',
      userId: 'demo-user-guest',
      amount: 42.5,
      reason: 'Organic Groceries & Market',
      category: 'Groceries',
      date: today,
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'demo-tx-2',
      userId: 'demo-user-guest',
      amount: 14.8,
      reason: 'Artisan Coffee & Croissant',
      category: 'Food & Dining',
      date: today,
      createdAt: Date.now() - 14400000,
    },
    {
      id: 'demo-tx-3',
      userId: 'demo-user-guest',
      amount: 28.0,
      type: 'spent',
      reason: 'Metro Transit Monthly Pass',
      category: 'Transport',
      date: yesterday,
      createdAt: Date.now() - 90000000,
    },
    {
      id: 'demo-tx-5',
      userId: 'demo-user-guest',
      amount: 50.0,
      type: 'received',
      reason: 'Cash Back & Refund Received',
      category: 'General',
      date: yesterday,
      createdAt: Date.now() - 70000000,
    },
    {
      id: 'demo-tx-4',
      userId: 'demo-user-guest',
      amount: 85.0,
      type: 'spent',
      reason: 'High-Speed Home Fiber Internet',
      category: 'Bills & Utilities',
      date: twoDaysAgo,
      createdAt: Date.now() - 180000000,
    },
  ];
}

function getInitialDemoPeople(): Person[] {
  return [
    {
      id: 'demo-person-1',
      userId: 'demo-user-guest',
      name: 'Sarah Miller',
      phone: '+1 555-0192',
      notes: 'Weekend trip carpool & lodging',
      balance: 65.0, // Positive: Sarah owes me
      createdAt: Date.now() - 400000000,
      updatedAt: Date.now() - 20000000,
    },
    {
      id: 'demo-person-2',
      userId: 'demo-user-guest',
      name: 'David Chen',
      phone: '+1 555-0188',
      notes: 'Concert ticket purchase',
      balance: -40.0, // Negative: I owe David
      createdAt: Date.now() - 500000000,
      updatedAt: Date.now() - 30000000,
    },
  ];
}

function getInitialDemoEntries(personId: string): LedgerEntry[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (personId === 'demo-person-1') {
    return [
      {
        id: 'demo-entry-1',
        userId: 'demo-user-guest',
        personId: 'demo-person-1',
        amount: 85.0,
        type: 'give',
        direction: 'to_take',
        reason: 'Paid for Airbnb cabin share',
        date: yesterday,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'demo-entry-2',
        userId: 'demo-user-guest',
        personId: 'demo-person-1',
        amount: 20.0,
        type: 'settlement',
        direction: 'to_take',
        reason: 'Partial repayment via cash',
        date: today,
        createdAt: Date.now() - 10000000,
      },
    ];
  }

  if (personId === 'demo-person-2') {
    return [
      {
        id: 'demo-entry-3',
        userId: 'demo-user-guest',
        personId: 'demo-person-2',
        amount: 40.0,
        type: 'take',
        direction: 'to_give',
        reason: 'David booked concert ticket for me',
        date: yesterday,
        createdAt: Date.now() - 86400000,
      },
    ];
  }

  return [];
}

// ================= SPENDING TRANSACTIONS =================

export function subscribeTransactions(
  userId: string,
  callback: (transactions: SpendingTransaction[], fromCache: boolean) => void,
  _onError?: (error: Error) => void
): () => void {
  const loadTransactions = () => {
    const key = getTxKey(userId);
    const stored = localStorage.getItem(key);
    let list: SpendingTransaction[];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        list = userId.startsWith('demo-') ? getInitialDemoTransactions() : [];
      }
    } else {
      list = userId.startsWith('demo-') ? getInitialDemoTransactions() : [];
      localStorage.setItem(key, JSON.stringify(list));
    }
    const deletedIds = new Set(getDeletedTxIds(userId));
    if (deletedIds.size > 0) {
      list = list.filter((t) => !deletedIds.has(t.id));
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    callback(list, true);
  };

  loadTransactions();

  const handleSync = () => loadTransactions();
  window.addEventListener(DATA_CHANGE_EVENT, handleSync);
  window.addEventListener(LOCAL_EDIT_EVENT, handleSync);
  window.addEventListener(REMOTE_DATA_EVENT, handleSync);
  window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
  window.addEventListener('storage', handleSync);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handleSync);
    window.removeEventListener(LOCAL_EDIT_EVENT, handleSync);
    window.removeEventListener(REMOTE_DATA_EVENT, handleSync);
    window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.removeEventListener('storage', handleSync);
  };
}

export async function addTransaction(
  userId: string,
  data: {
    amount: number;
    type?: TransactionType;
    reason: string;
    date: string;
    category?: string;
  }
): Promise<string> {
  const key = getTxKey(userId);
  const stored = localStorage.getItem(key);
  let list: SpendingTransaction[];
  if (stored) {
    try {
      list = JSON.parse(stored);
    } catch {
      list = userId.startsWith('demo-') ? getInitialDemoTransactions() : [];
    }
  } else {
    list = userId.startsWith('demo-') ? getInitialDemoTransactions() : [];
  }

  const newId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newTx: SpendingTransaction = {
    id: newId,
    userId,
    amount: Number(data.amount),
    type: data.type || 'spent',
    reason: data.reason.trim(),
    date: data.date,
    category: data.category || 'General',
    createdAt: Date.now(),
  };

  list.unshift(newTx);
  localStorage.setItem(key, JSON.stringify(list));
  notifyDataChange(true);
  return newId;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  data: Partial<SpendingTransaction>
): Promise<void> {
  const key = getTxKey(userId);
  const stored = localStorage.getItem(key);
  const list: SpendingTransaction[] = stored ? JSON.parse(stored) : [];
  const index = list.findIndex((t) => t.id === transactionId);
  if (index !== -1) {
    list[index] = {
      ...list[index],
      ...data,
      type: data.type !== undefined ? data.type : (list[index].type || 'spent'),
      amount: data.amount !== undefined ? Number(data.amount) : list[index].amount,
      reason: data.reason !== undefined ? data.reason.trim() : list[index].reason,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(list));
    notifyDataChange(true);
  }
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const key = getTxKey(userId);
  const stored = localStorage.getItem(key);
  const list: SpendingTransaction[] = stored ? JSON.parse(stored) : [];
  const filtered = list.filter((t) => t.id !== transactionId);
  localStorage.setItem(key, JSON.stringify(filtered));
  
  // Record tombstone so Drive sync will permanently delete this across devices
  recordDeletedTxId(userId, transactionId);
  notifyDataChange(true);
}

// ================= PEOPLE & DEBTS =================

export function calculateBalanceFromEntries(entries: LedgerEntry[]): number {
  return entries.reduce((acc, entry) => {
    const numAmount = Math.abs(Number(entry.amount) || 0);
    if (entry.type === 'give') {
      return acc + numAmount;
    } else if (entry.type === 'take') {
      return acc - numAmount;
    } else if (entry.type === 'settlement') {
      if (entry.direction === 'to_take') {
        return acc - numAmount;
      } else {
        return acc + numAmount;
      }
    }
    return acc;
  }, 0);
}

export function subscribePeople(
  userId: string,
  callback: (people: Person[], fromCache: boolean) => void,
  _onError?: (error: Error) => void
): () => void {
  const loadPeople = () => {
    const key = getPeopleKey(userId);
    const stored = localStorage.getItem(key);
    let list: Person[];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        list = userId.startsWith('demo-') ? getInitialDemoPeople() : [];
      }
    } else {
      list = userId.startsWith('demo-') ? getInitialDemoPeople() : [];
      localStorage.setItem(key, JSON.stringify(list));
    }
    const deletedIds = new Set(getDeletedPersonIds(userId));
    if (deletedIds.size > 0) {
      list = list.filter((p) => !deletedIds.has(p.id));
    }

    // Mathematically synchronize every person's balance from their recorded entries
    let peopleChanged = false;
    list = list.map((p) => {
      const eKey = getEntriesKey(userId, p.id);
      const eStored = localStorage.getItem(eKey);
      if (eStored) {
        try {
          const entries: LedgerEntry[] = JSON.parse(eStored);
          if (entries && entries.length > 0) {
            const calculated = calculateBalanceFromEntries(entries);
            if (Math.abs((p.balance || 0) - calculated) > 0.001) {
              peopleChanged = true;
              return { ...p, balance: calculated };
            }
          }
        } catch {
          // ignore parsing error
        }
      }
      return p;
    });

    if (peopleChanged) {
      localStorage.setItem(key, JSON.stringify(list));
    }

    list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    callback(list, true);
  };

  loadPeople();

  const handleSync = () => loadPeople();
  window.addEventListener(DATA_CHANGE_EVENT, handleSync);
  window.addEventListener(LOCAL_EDIT_EVENT, handleSync);
  window.addEventListener(REMOTE_DATA_EVENT, handleSync);
  window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
  window.addEventListener('storage', handleSync);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handleSync);
    window.removeEventListener(LOCAL_EDIT_EVENT, handleSync);
    window.removeEventListener(REMOTE_DATA_EVENT, handleSync);
    window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.removeEventListener('storage', handleSync);
  };
}

export async function addPerson(
  userId: string,
  data: {
    name: string;
    phone?: string;
    notes?: string;
    initialAmount?: number;
    initialType?: 'give' | 'take';
    initialReason?: string;
    initialDate?: string;
  }
): Promise<string> {
  const now = Date.now();
  let initialBalance = 0;
  if (data.initialAmount && data.initialAmount > 0) {
    if (data.initialType === 'give') {
      initialBalance = data.initialAmount;
    } else if (data.initialType === 'take') {
      initialBalance = -data.initialAmount;
    }
  }

  const peopleKey = getPeopleKey(userId);
  const stored = localStorage.getItem(peopleKey);
  const list: Person[] = stored
    ? JSON.parse(stored)
    : userId.startsWith('demo-')
      ? getInitialDemoPeople()
      : [];

  const newPersonId = `person-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const newPerson: Person = {
    id: newPersonId,
    userId,
    name: data.name.trim(),
    phone: data.phone?.trim() || '',
    notes: data.notes?.trim() || '',
    balance: initialBalance,
    createdAt: now,
    updatedAt: now,
  };

  list.unshift(newPerson);
  localStorage.setItem(peopleKey, JSON.stringify(list));

  if (data.initialAmount && data.initialAmount > 0) {
    const entriesKey = getEntriesKey(userId, newPersonId);
    const entries: LedgerEntry[] = [
      {
        id: `entry-${now}`,
        userId,
        personId: newPersonId,
        amount: data.initialAmount,
        type: data.initialType === 'give' ? 'give' : 'take',
        direction: data.initialType === 'give' ? 'to_take' : 'to_give',
        reason: data.initialReason?.trim() || 'Initial Balance',
        date: data.initialDate || new Date().toISOString().split('T')[0],
        createdAt: now,
      },
    ];
    localStorage.setItem(entriesKey, JSON.stringify(entries));
  }

  notifyDataChange(true);
  return newPersonId;
}

export async function deletePerson(userId: string, personId: string): Promise<void> {
  const peopleKey = getPeopleKey(userId);
  const stored = localStorage.getItem(peopleKey);
  const list: Person[] = stored ? JSON.parse(stored) : [];
  const filtered = list.filter((p) => p.id !== personId);
  localStorage.setItem(peopleKey, JSON.stringify(filtered));

  const entriesKey = getEntriesKey(userId, personId);
  localStorage.removeItem(entriesKey);

  recordDeletedPersonId(userId, personId);
  notifyDataChange(true);
}

export async function cleanUpSettledPeople(userId: string): Promise<number> {
  const peopleKey = getPeopleKey(userId);
  const stored = localStorage.getItem(peopleKey);
  const list: Person[] = stored ? JSON.parse(stored) : [];
  const settled = list.filter((p) => Math.abs(p.balance || 0) < 0.01);
  const remaining = list.filter((p) => Math.abs(p.balance || 0) >= 0.01);

  settled.forEach((p) => {
    localStorage.removeItem(getEntriesKey(userId, p.id));
    recordDeletedPersonId(userId, p.id);
  });

  localStorage.setItem(peopleKey, JSON.stringify(remaining));
  notifyDataChange(true);
  return settled.length;
}

// ================= LEDGER ENTRIES =================

export function subscribePersonEntries(
  userId: string,
  personId: string,
  callback: (entries: LedgerEntry[]) => void,
  _onError?: (error: Error) => void
): () => void {
  const loadEntries = () => {
    const entriesKey = getEntriesKey(userId, personId);
    const stored = localStorage.getItem(entriesKey);
    let list: LedgerEntry[];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        list = userId.startsWith('demo-') ? getInitialDemoEntries(personId) : [];
      }
    } else {
      list = userId.startsWith('demo-') ? getInitialDemoEntries(personId) : [];
      localStorage.setItem(entriesKey, JSON.stringify(list));
    }
    const deletedEntryIds = new Set(getDeletedEntryIds(userId));
    if (deletedEntryIds.size > 0) {
      list = list.filter((e) => !deletedEntryIds.has(e.id));
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    callback(list);
  };

  loadEntries();

  const handleSync = () => loadEntries();
  window.addEventListener(DATA_CHANGE_EVENT, handleSync);
  window.addEventListener(LOCAL_EDIT_EVENT, handleSync);
  window.addEventListener(REMOTE_DATA_EVENT, handleSync);
  window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
  window.addEventListener('storage', handleSync);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handleSync);
    window.removeEventListener(LOCAL_EDIT_EVENT, handleSync);
    window.removeEventListener(REMOTE_DATA_EVENT, handleSync);
    window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.removeEventListener('storage', handleSync);
  };
}

export async function addLedgerEntry(
  userId: string,
  personId: string,
  entry: {
    amount: number;
    type: LedgerEntryType;
    direction: 'to_give' | 'to_take';
    reason: string;
    date: string;
  },
  removeIfZero?: boolean
): Promise<{ entryId: string; personRemoved: boolean }> {
  const now = Date.now();
  const numAmount = Math.abs(Number(entry.amount));

  // 1. Add entry first
  const entriesKey = getEntriesKey(userId, personId);
  const storedEntries = localStorage.getItem(entriesKey);
  const entries: LedgerEntry[] = storedEntries
    ? JSON.parse(storedEntries)
    : userId.startsWith('demo-')
      ? getInitialDemoEntries(personId)
      : [];
  const newEntryId = `entry-${now}-${Math.random().toString(36).slice(2, 7)}`;
  entries.unshift({
    id: newEntryId,
    userId,
    personId,
    amount: numAmount,
    type: entry.type,
    direction: entry.direction,
    reason: entry.reason.trim(),
    date: entry.date,
    createdAt: now,
  });
  localStorage.setItem(entriesKey, JSON.stringify(entries));

  // 2. Compute exact balance from all entries
  const updatedBalance = calculateBalanceFromEntries(entries);

  // 3. Update Person balance in storage
  const peopleKey = getPeopleKey(userId);
  const storedPeople = localStorage.getItem(peopleKey);
  const people: Person[] = storedPeople
    ? JSON.parse(storedPeople)
    : userId.startsWith('demo-')
      ? getInitialDemoPeople()
      : [];
  const personIndex = people.findIndex((p) => p.id === personId);
  if (personIndex !== -1) {
    people[personIndex].balance = updatedBalance;
    people[personIndex].updatedAt = now;
    localStorage.setItem(peopleKey, JSON.stringify(people));
  }

  let personRemoved = false;
  if (removeIfZero && Math.abs(updatedBalance) < 0.01) {
    await deletePerson(userId, personId);
    personRemoved = true;
  } else {
    notifyDataChange(true);
  }

  return { entryId: newEntryId, personRemoved };
}

export async function deleteLedgerEntry(
  userId: string,
  personId: string,
  entryId: string,
  _entry?: {
    amount: number;
    type: LedgerEntryType;
    direction: 'to_give' | 'to_take';
  }
): Promise<void> {
  const entriesKey = getEntriesKey(userId, personId);
  const storedEntries = localStorage.getItem(entriesKey);
  const entries: LedgerEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
  const filtered = entries.filter((e) => e.id !== entryId);
  localStorage.setItem(entriesKey, JSON.stringify(filtered));

  const updatedBalance = calculateBalanceFromEntries(filtered);

  const peopleKey = getPeopleKey(userId);
  const storedPeople = localStorage.getItem(peopleKey);
  const people: Person[] = storedPeople ? JSON.parse(storedPeople) : [];
  const personIndex = people.findIndex((p) => p.id === personId);
  if (personIndex !== -1) {
    people[personIndex].balance = updatedBalance;
    people[personIndex].updatedAt = Date.now();
    localStorage.setItem(peopleKey, JSON.stringify(people));
  }

  recordDeletedEntryId(userId, entryId);
  notifyDataChange(true);
}
