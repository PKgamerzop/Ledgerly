import { SpendingTransaction, Person, LedgerEntry, LedgerEntryType } from '../types';
import { markLocalEdit } from '../services/googleDriveSync';

// Event emitter helper for local reactive updates across views & tabs
const DEMO_TX_KEY = 'ledgerly_demo_transactions';
const DEMO_PEOPLE_KEY = 'ledgerly_demo_people';
const DEMO_ENTRIES_PREFIX = 'ledgerly_demo_entries_';
const DATA_CHANGE_EVENT = 'ledgerly_data_change';
const DEMO_CHANGE_EVENT = 'ledgerly_demo_data_change';

function notifyDataChange() {
  markLocalEdit();
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
      reason: 'Metro Transit Monthly Pass',
      category: 'Transport',
      date: yesterday,
      createdAt: Date.now() - 90000000,
    },
    {
      id: 'demo-tx-4',
      userId: 'demo-user-guest',
      amount: 85.0,
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
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    callback(list, true);
  };

  loadTransactions();

  const handleSync = () => loadTransactions();
  window.addEventListener(DATA_CHANGE_EVENT, handleSync);
  window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
  window.addEventListener('storage', handleSync);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handleSync);
    window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.removeEventListener('storage', handleSync);
  };
}

export async function addTransaction(
  userId: string,
  data: {
    amount: number;
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
    reason: data.reason.trim(),
    date: data.date,
    category: data.category || 'General',
    createdAt: Date.now(),
  };

  list.unshift(newTx);
  localStorage.setItem(key, JSON.stringify(list));
  notifyDataChange();
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
      amount: data.amount !== undefined ? Number(data.amount) : list[index].amount,
      reason: data.reason !== undefined ? data.reason.trim() : list[index].reason,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(list));
    notifyDataChange();
  }
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const key = getTxKey(userId);
  const stored = localStorage.getItem(key);
  const list: SpendingTransaction[] = stored ? JSON.parse(stored) : [];
  const filtered = list.filter((t) => t.id !== transactionId);
  localStorage.setItem(key, JSON.stringify(filtered));
  notifyDataChange();
}

// ================= PEOPLE & DEBTS =================

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
    list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    callback(list, true);
  };

  loadPeople();

  const handleSync = () => loadPeople();
  window.addEventListener(DATA_CHANGE_EVENT, handleSync);
  window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
  window.addEventListener('storage', handleSync);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handleSync);
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

  notifyDataChange();
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

  notifyDataChange();
}

export async function cleanUpSettledPeople(userId: string): Promise<number> {
  const peopleKey = getPeopleKey(userId);
  const stored = localStorage.getItem(peopleKey);
  const list: Person[] = stored ? JSON.parse(stored) : [];
  const settled = list.filter((p) => Math.abs(p.balance || 0) < 0.01);
  const remaining = list.filter((p) => Math.abs(p.balance || 0) >= 0.01);

  settled.forEach((p) => {
    localStorage.removeItem(getEntriesKey(userId, p.id));
  });

  localStorage.setItem(peopleKey, JSON.stringify(remaining));
  notifyDataChange();
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
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    callback(list);
  };

  loadEntries();

  const handleSync = () => loadEntries();
  window.addEventListener(DATA_CHANGE_EVENT, handleSync);
  window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
  window.addEventListener('storage', handleSync);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handleSync);
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

  let balanceDelta = 0;
  if (entry.type === 'give') {
    balanceDelta = numAmount;
  } else if (entry.type === 'take') {
    balanceDelta = -numAmount;
  } else if (entry.type === 'settlement') {
    if (entry.direction === 'to_take') {
      balanceDelta = -numAmount;
    } else {
      balanceDelta = numAmount;
    }
  }

  // Update Person balance
  const peopleKey = getPeopleKey(userId);
  const storedPeople = localStorage.getItem(peopleKey);
  const people: Person[] = storedPeople
    ? JSON.parse(storedPeople)
    : userId.startsWith('demo-')
      ? getInitialDemoPeople()
      : [];
  const personIndex = people.findIndex((p) => p.id === personId);
  let updatedBalance = 0;
  if (personIndex !== -1) {
    updatedBalance = (people[personIndex].balance || 0) + balanceDelta;
    people[personIndex].balance = updatedBalance;
    people[personIndex].updatedAt = now;
    localStorage.setItem(peopleKey, JSON.stringify(people));
  }

  // Add entry
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

  let personRemoved = false;
  if (removeIfZero && Math.abs(updatedBalance) < 0.01) {
    await deletePerson(userId, personId);
    personRemoved = true;
  } else {
    notifyDataChange();
  }

  return { entryId: newEntryId, personRemoved };
}

export async function deleteLedgerEntry(
  userId: string,
  personId: string,
  entryId: string,
  entry: {
    amount: number;
    type: LedgerEntryType;
    direction: 'to_give' | 'to_take';
  }
): Promise<void> {
  const numAmount = Math.abs(Number(entry.amount));
  let balanceDelta = 0;
  if (entry.type === 'give') {
    balanceDelta = -numAmount;
  } else if (entry.type === 'take') {
    balanceDelta = numAmount;
  } else if (entry.type === 'settlement') {
    if (entry.direction === 'to_take') {
      balanceDelta = numAmount;
    } else {
      balanceDelta = -numAmount;
    }
  }

  const peopleKey = getPeopleKey(userId);
  const storedPeople = localStorage.getItem(peopleKey);
  const people: Person[] = storedPeople ? JSON.parse(storedPeople) : [];
  const personIndex = people.findIndex((p) => p.id === personId);
  if (personIndex !== -1) {
    people[personIndex].balance = (people[personIndex].balance || 0) + balanceDelta;
    people[personIndex].updatedAt = Date.now();
    localStorage.setItem(peopleKey, JSON.stringify(people));
  }

  const entriesKey = getEntriesKey(userId, personId);
  const storedEntries = localStorage.getItem(entriesKey);
  const entries: LedgerEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
  const filtered = entries.filter((e) => e.id !== entryId);
  localStorage.setItem(entriesKey, JSON.stringify(filtered));
  notifyDataChange();
}
