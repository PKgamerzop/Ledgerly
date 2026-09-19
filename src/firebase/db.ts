import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import { SpendingTransaction, Person, LedgerEntry, LedgerEntryType } from '../types';

// Event emitter helper for local demo changes
const DEMO_TX_KEY = 'ledgerly_demo_transactions';
const DEMO_PEOPLE_KEY = 'ledgerly_demo_people';
const DEMO_ENTRIES_PREFIX = 'ledgerly_demo_entries_';
const DEMO_CHANGE_EVENT = 'ledgerly_demo_data_change';

function notifyDemoChange() {
  window.dispatchEvent(new CustomEvent(DEMO_CHANGE_EVENT));
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
  onError?: (error: Error) => void
) {
  if (userId.startsWith('demo-')) {
    const loadDemo = () => {
      const stored = localStorage.getItem(DEMO_TX_KEY);
      let list: SpendingTransaction[];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {
          list = getInitialDemoTransactions();
        }
      } else {
        list = getInitialDemoTransactions();
        localStorage.setItem(DEMO_TX_KEY, JSON.stringify(list));
      }
      list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      callback(list, true);
    };

    loadDemo();
    const handleSync = () => loadDemo();
    window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }

  const collRef = collection(db, 'users', userId, 'transactions');
  const q = query(collRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const fromCache = snapshot.metadata.fromCache;
      const transactions: SpendingTransaction[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SpendingTransaction, 'id'>),
      }));
      callback(transactions, fromCache);
    },
    (err) => {
      console.error('Transactions subscription error:', err);
      if (onError) onError(err);
    }
  );
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
  if (userId.startsWith('demo-')) {
    const stored = localStorage.getItem(DEMO_TX_KEY);
    const list: SpendingTransaction[] = stored ? JSON.parse(stored) : getInitialDemoTransactions();
    const newId = `demo-tx-${Date.now()}`;
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
    localStorage.setItem(DEMO_TX_KEY, JSON.stringify(list));
    notifyDemoChange();
    return newId;
  }

  const collRef = collection(db, 'users', userId, 'transactions');
  const docRef = await addDoc(collRef, {
    userId,
    amount: Number(data.amount),
    reason: data.reason.trim(),
    date: data.date,
    category: data.category || 'General',
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  data: Partial<SpendingTransaction>
): Promise<void> {
  if (userId.startsWith('demo-')) {
    const stored = localStorage.getItem(DEMO_TX_KEY);
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
      localStorage.setItem(DEMO_TX_KEY, JSON.stringify(list));
      notifyDemoChange();
    }
    return;
  }

  const docRef = doc(db, 'users', userId, 'transactions', transactionId);
  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: Date.now(),
  };
  if (data.amount !== undefined) {
    updatePayload.amount = Number(data.amount);
  }
  if (data.reason !== undefined) {
    updatePayload.reason = data.reason.trim();
  }
  await updateDoc(docRef, updatePayload);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  if (userId.startsWith('demo-')) {
    const stored = localStorage.getItem(DEMO_TX_KEY);
    const list: SpendingTransaction[] = stored ? JSON.parse(stored) : [];
    const filtered = list.filter((t) => t.id !== transactionId);
    localStorage.setItem(DEMO_TX_KEY, JSON.stringify(filtered));
    notifyDemoChange();
    return;
  }

  const docRef = doc(db, 'users', userId, 'transactions', transactionId);
  await deleteDoc(docRef);
}

// ================= PEOPLE & DEBTS =================

export function subscribePeople(
  userId: string,
  callback: (people: Person[], fromCache: boolean) => void,
  onError?: (error: Error) => void
) {
  if (userId.startsWith('demo-')) {
    const loadDemoPeople = () => {
      const stored = localStorage.getItem(DEMO_PEOPLE_KEY);
      let list: Person[];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {
          list = getInitialDemoPeople();
        }
      } else {
        list = getInitialDemoPeople();
        localStorage.setItem(DEMO_PEOPLE_KEY, JSON.stringify(list));
      }
      callback(list, true);
    };

    loadDemoPeople();
    const handleSync = () => loadDemoPeople();
    window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }

  const collRef = collection(db, 'users', userId, 'people');
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const fromCache = snapshot.metadata.fromCache;
      const people: Person[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Person, 'id'>),
      }));
      callback(people, fromCache);
    },
    (err) => {
      console.error('People subscription error:', err);
      if (onError) onError(err);
    }
  );
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

  if (userId.startsWith('demo-')) {
    const stored = localStorage.getItem(DEMO_PEOPLE_KEY);
    const list: Person[] = stored ? JSON.parse(stored) : getInitialDemoPeople();
    const newPersonId = `demo-person-${Date.now()}`;
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
    localStorage.setItem(DEMO_PEOPLE_KEY, JSON.stringify(list));

    if (data.initialAmount && data.initialAmount > 0) {
      const entries: LedgerEntry[] = [
        {
          id: `demo-entry-${Date.now()}`,
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
      localStorage.setItem(`${DEMO_ENTRIES_PREFIX}${newPersonId}`, JSON.stringify(entries));
    }

    notifyDemoChange();
    return newPersonId;
  }

  const peopleCollRef = collection(db, 'users', userId, 'people');
  const personDocRef = await addDoc(peopleCollRef, {
    userId,
    name: data.name.trim(),
    phone: data.phone?.trim() || '',
    notes: data.notes?.trim() || '',
    balance: initialBalance,
    createdAt: now,
    updatedAt: now,
  });

  if (data.initialAmount && data.initialAmount > 0) {
    const entriesCollRef = collection(db, 'users', userId, 'people', personDocRef.id, 'entries');
    const isToTake = data.initialType === 'give';
    await addDoc(entriesCollRef, {
      userId,
      personId: personDocRef.id,
      amount: data.initialAmount,
      type: data.initialType === 'give' ? 'give' : 'take',
      direction: isToTake ? 'to_take' : 'to_give',
      reason: data.initialReason?.trim() || 'Initial Balance',
      date: data.initialDate || new Date().toISOString().split('T')[0],
      createdAt: now,
    });
  }

  return personDocRef.id;
}

export async function deletePerson(userId: string, personId: string): Promise<void> {
  if (userId.startsWith('demo-')) {
    const stored = localStorage.getItem(DEMO_PEOPLE_KEY);
    const list: Person[] = stored ? JSON.parse(stored) : [];
    const filtered = list.filter((p) => p.id !== personId);
    localStorage.setItem(DEMO_PEOPLE_KEY, JSON.stringify(filtered));
    localStorage.removeItem(`${DEMO_ENTRIES_PREFIX}${personId}`);
    notifyDemoChange();
    return;
  }

  const entriesCollRef = collection(db, 'users', userId, 'people', personId, 'entries');
  const entriesSnap = await getDocs(entriesCollRef);
  const deletePromises = entriesSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);

  const personDocRef = doc(db, 'users', userId, 'people', personId);
  await deleteDoc(personDocRef);
}

export async function cleanUpSettledPeople(userId: string): Promise<number> {
  if (userId.startsWith('demo-')) {
    const stored = localStorage.getItem(DEMO_PEOPLE_KEY);
    const list: Person[] = stored ? JSON.parse(stored) : [];
    const settled = list.filter((p) => Math.abs(p.balance || 0) < 0.01);
    const remaining = list.filter((p) => Math.abs(p.balance || 0) >= 0.01);
    settled.forEach((p) => localStorage.removeItem(`${DEMO_ENTRIES_PREFIX}${p.id}`));
    localStorage.setItem(DEMO_PEOPLE_KEY, JSON.stringify(remaining));
    notifyDemoChange();
    return settled.length;
  }

  const peopleCollRef = collection(db, 'users', userId, 'people');
  const snap = await getDocs(peopleCollRef);
  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (Math.abs(data.balance || 0) < 0.01) {
      await deletePerson(userId, docSnap.id);
      count++;
    }
  }
  return count;
}

// ================= LEDGER ENTRIES =================

export function subscribePersonEntries(
  userId: string,
  personId: string,
  callback: (entries: LedgerEntry[]) => void,
  onError?: (error: Error) => void
) {
  if (userId.startsWith('demo-')) {
    const loadDemoEntries = () => {
      const stored = localStorage.getItem(`${DEMO_ENTRIES_PREFIX}${personId}`);
      let list: LedgerEntry[];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {
          list = getInitialDemoEntries(personId);
        }
      } else {
        list = getInitialDemoEntries(personId);
        localStorage.setItem(`${DEMO_ENTRIES_PREFIX}${personId}`, JSON.stringify(list));
      }
      list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      callback(list);
    };

    loadDemoEntries();
    const handleSync = () => loadDemoEntries();
    window.addEventListener(DEMO_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(DEMO_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }

  const entriesCollRef = collection(db, 'users', userId, 'people', personId, 'entries');
  const q = query(entriesCollRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: LedgerEntry[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<LedgerEntry, 'id'>),
      }));
      callback(entries);
    },
    (err) => {
      console.error('Person entries subscription error:', err);
      if (onError) onError(err);
    }
  );
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

  if (userId.startsWith('demo-')) {
    // Update Person balance
    const storedPeople = localStorage.getItem(DEMO_PEOPLE_KEY);
    const people: Person[] = storedPeople ? JSON.parse(storedPeople) : getInitialDemoPeople();
    const personIndex = people.findIndex((p) => p.id === personId);
    let updatedBalance = 0;
    if (personIndex !== -1) {
      updatedBalance = (people[personIndex].balance || 0) + balanceDelta;
      people[personIndex].balance = updatedBalance;
      people[personIndex].updatedAt = now;
      localStorage.setItem(DEMO_PEOPLE_KEY, JSON.stringify(people));
    }

    // Add entry
    const entriesKey = `${DEMO_ENTRIES_PREFIX}${personId}`;
    const storedEntries = localStorage.getItem(entriesKey);
    const entries: LedgerEntry[] = storedEntries ? JSON.parse(storedEntries) : getInitialDemoEntries(personId);
    const newEntryId = `demo-entry-${Date.now()}`;
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
      notifyDemoChange();
    }

    return { entryId: newEntryId, personRemoved };
  }

  const personDocRef = doc(db, 'users', userId, 'people', personId);
  const entriesCollRef = collection(db, 'users', userId, 'people', personId, 'entries');

  let newEntryId = '';
  let updatedBalance = 0;

  await runTransaction(db, async (transaction) => {
    const personSnap = await transaction.get(personDocRef);
    if (!personSnap.exists()) {
      throw new Error('Person not found');
    }

    const currentBalance = personSnap.data().balance || 0;
    updatedBalance = currentBalance + balanceDelta;

    const newEntryRef = doc(entriesCollRef);
    newEntryId = newEntryRef.id;

    transaction.set(newEntryRef, {
      userId,
      personId,
      amount: numAmount,
      type: entry.type,
      direction: entry.direction,
      reason: entry.reason.trim(),
      date: entry.date,
      createdAt: now,
    });

    transaction.update(personDocRef, {
      balance: updatedBalance,
      updatedAt: now,
    });
  });

  let personRemoved = false;
  if (removeIfZero && Math.abs(updatedBalance) < 0.01) {
    await deletePerson(userId, personId);
    personRemoved = true;
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

  if (userId.startsWith('demo-')) {
    const storedPeople = localStorage.getItem(DEMO_PEOPLE_KEY);
    const people: Person[] = storedPeople ? JSON.parse(storedPeople) : [];
    const personIndex = people.findIndex((p) => p.id === personId);
    if (personIndex !== -1) {
      people[personIndex].balance = (people[personIndex].balance || 0) + balanceDelta;
      people[personIndex].updatedAt = Date.now();
      localStorage.setItem(DEMO_PEOPLE_KEY, JSON.stringify(people));
    }

    const entriesKey = `${DEMO_ENTRIES_PREFIX}${personId}`;
    const storedEntries = localStorage.getItem(entriesKey);
    const entries: LedgerEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
    const filtered = entries.filter((e) => e.id !== entryId);
    localStorage.setItem(entriesKey, JSON.stringify(filtered));
    notifyDemoChange();
    return;
  }

  const personDocRef = doc(db, 'users', userId, 'people', personId);
  const entryDocRef = doc(db, 'users', userId, 'people', personId, 'entries', entryId);

  await runTransaction(db, async (transaction) => {
    const personSnap = await transaction.get(personDocRef);
    if (personSnap.exists()) {
      const currentBalance = personSnap.data().balance || 0;
      transaction.update(personDocRef, {
        balance: currentBalance + balanceDelta,
        updatedAt: Date.now(),
      });
    }
    transaction.delete(entryDocRef);
  });
}
