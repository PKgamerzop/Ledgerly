import { SpendingTransaction, Person, LedgerEntry } from '../types';
import {
  getDeletedTxIds,
  saveDeletedTxIds,
  getDeletedPersonIds,
  saveDeletedPersonIds,
  getDeletedEntryIds,
  saveDeletedEntryIds,
  DATA_CHANGE_EVENT,
  REMOTE_DATA_EVENT,
} from '../db/storage';

export const VAULT_FILE_NAME = 'ledgerly_personal_vault.json';

export interface VaultPayload {
  version: number;
  lastModified: number;
  userId: string;
  transactions: SpendingTransaction[];
  people: Person[];
  ledgerEntries: Record<string, LedgerEntry[]>;
  deletedTxIds?: string[];
  deletedPersonIds?: string[];
  deletedEntryIds?: string[];
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unlinked';

const DRIVE_SYNC_EVENT = 'ledgerly_drive_sync_change';
const LAST_LOCAL_EDIT_KEY = 'ledgerly_last_local_edit_time';

let currentSyncStatus: SyncStatus = 'idle';
let lastSyncTimestamp: number | null = null;
let lastSyncError: string | null = null;

export function getSyncState() {
  return {
    status: currentSyncStatus,
    lastSyncTimestamp,
    error: lastSyncError,
  };
}

function updateSyncState(status: SyncStatus, error: string | null = null) {
  currentSyncStatus = status;
  lastSyncError = error;
  if (status === 'synced') {
    lastSyncTimestamp = Date.now();
  }
  window.dispatchEvent(
    new CustomEvent(DRIVE_SYNC_EVENT, {
      detail: { status, lastSyncTimestamp, error },
    })
  );
}

export function markLocalEdit() {
  localStorage.setItem(LAST_LOCAL_EDIT_KEY, String(Date.now()));
}

export function subscribeSyncState(
  callback: (state: { status: SyncStatus; lastSyncTimestamp: number | null; error: string | null }) => void
) {
  const handler = () => {
    callback(getSyncState());
  };
  window.addEventListener(DRIVE_SYNC_EVENT, handler);
  callback(getSyncState());
  return () => window.removeEventListener(DRIVE_SYNC_EVENT, handler);
}

/**
 * Collect all current local data for the user into a portable Vault payload
 */
export function exportLocalVault(userId: string): VaultPayload {
  const txKey = userId.startsWith('demo-') ? 'ledgerly_demo_transactions' : `ledgerly_tx_${userId}`;
  const peopleKey = userId.startsWith('demo-') ? 'ledgerly_demo_people' : `ledgerly_people_${userId}`;

  const transactions: SpendingTransaction[] = JSON.parse(localStorage.getItem(txKey) || '[]');
  const people: Person[] = JSON.parse(localStorage.getItem(peopleKey) || '[]');

  const ledgerEntries: Record<string, LedgerEntry[]> = {};
  people.forEach((p) => {
    const entryKey = userId.startsWith('demo-')
      ? `ledgerly_demo_entries_${p.id}`
      : `ledgerly_entries_${userId}_${p.id}`;
    ledgerEntries[p.id] = JSON.parse(localStorage.getItem(entryKey) || '[]');
  });

  const savedEditTime = parseInt(localStorage.getItem(LAST_LOCAL_EDIT_KEY) || '0', 10);

  return {
    version: 1,
    lastModified: savedEditTime || Date.now(),
    userId,
    transactions,
    people,
    ledgerEntries,
    deletedTxIds: getDeletedTxIds(userId),
    deletedPersonIds: getDeletedPersonIds(userId),
    deletedEntryIds: getDeletedEntryIds(userId),
  };
}

/**
 * Apply remote Vault payload into local storage and notify UI
 */
export function importRemoteVault(payload: VaultPayload, userId: string) {
  const txKey = userId.startsWith('demo-') ? 'ledgerly_demo_transactions' : `ledgerly_tx_${userId}`;
  const peopleKey = userId.startsWith('demo-') ? 'ledgerly_demo_people' : `ledgerly_people_${userId}`;

  // 1. Save tombstones first
  if (payload.deletedTxIds && payload.deletedTxIds.length > 0) {
    saveDeletedTxIds(userId, payload.deletedTxIds);
  }
  if (payload.deletedPersonIds && payload.deletedPersonIds.length > 0) {
    saveDeletedPersonIds(userId, payload.deletedPersonIds);
  }
  if (payload.deletedEntryIds && payload.deletedEntryIds.length > 0) {
    saveDeletedEntryIds(userId, payload.deletedEntryIds);
  }

  const deletedTxSet = new Set(getDeletedTxIds(userId));
  const validTransactions = (payload.transactions || []).filter((t) => !deletedTxSet.has(t.id));

  const deletedPersonSet = new Set(getDeletedPersonIds(userId));
  const validPeople = (payload.people || []).filter((p) => !deletedPersonSet.has(p.id));

  // Save transactions & people
  localStorage.setItem(txKey, JSON.stringify(validTransactions));
  localStorage.setItem(peopleKey, JSON.stringify(validPeople));

  // Save ledger entries
  const deletedEntrySet = new Set(getDeletedEntryIds(userId));
  if (payload.ledgerEntries) {
    Object.entries(payload.ledgerEntries).forEach(([personId, entries]) => {
      if (deletedPersonSet.has(personId)) {
        localStorage.removeItem(
          userId.startsWith('demo-')
            ? `ledgerly_demo_entries_${personId}`
            : `ledgerly_entries_${userId}_${personId}`
        );
        return;
      }
      const entryKey = userId.startsWith('demo-')
        ? `ledgerly_demo_entries_${personId}`
        : `ledgerly_entries_${userId}_${personId}`;
      const validEntries = (entries || []).filter((e) => !deletedEntrySet.has(e.id));
      localStorage.setItem(entryKey, JSON.stringify(validEntries));
    });
  }

  // Record modification time
  if (payload.lastModified) {
    localStorage.setItem(LAST_LOCAL_EDIT_KEY, String(payload.lastModified));
  }

  // Trigger UI updates (REMOTE event + DATA event, NOT local edit event)
  window.dispatchEvent(new CustomEvent(REMOTE_DATA_EVENT));
  window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
}

/**
 * Merge local and remote payloads without dropping either device's records.
 * Resolves by record ID union, while strictly honoring deletion tombstones.
 */
function mergeVaults(local: VaultPayload, remote: VaultPayload, userId: string): VaultPayload {
  // Collect all deleted IDs across both local and remote
  const allDeletedTxIds = new Set([
    ...(local.deletedTxIds || []),
    ...(remote.deletedTxIds || []),
    ...getDeletedTxIds(userId),
  ]);
  const allDeletedPersonIds = new Set([
    ...(local.deletedPersonIds || []),
    ...(remote.deletedPersonIds || []),
    ...getDeletedPersonIds(userId),
  ]);
  const allDeletedEntryIds = new Set([
    ...(local.deletedEntryIds || []),
    ...(remote.deletedEntryIds || []),
    ...getDeletedEntryIds(userId),
  ]);

  // 1. Merge transactions by ID (excluding any deleted transactions)
  const txMap = new Map<string, SpendingTransaction>();
  (remote.transactions || []).forEach((t) => {
    if (!allDeletedTxIds.has(t.id)) {
      txMap.set(t.id, t);
    }
  });
  (local.transactions || []).forEach((t) => {
    if (!allDeletedTxIds.has(t.id)) {
      if (!txMap.has(t.id)) {
        txMap.set(t.id, t);
      } else {
        const existing = txMap.get(t.id)!;
        // Prefer newer record if timestamps exist
        if ((t.createdAt || 0) >= (existing.createdAt || 0)) {
          txMap.set(t.id, t);
        }
      }
    }
  });
  const mergedTransactions = Array.from(txMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)
  );

  // 2. Merge people by ID or Name (excluding any deleted people)
  const peopleMap = new Map<string, Person>();
  (remote.people || []).forEach((p) => {
    if (!allDeletedPersonIds.has(p.id)) {
      peopleMap.set(p.id, p);
    }
  });
  (local.people || []).forEach((p) => {
    if (!allDeletedPersonIds.has(p.id)) {
      const existing = Array.from(peopleMap.values()).find(
        (ep) => ep.id === p.id || ep.name.toLowerCase() === p.name.toLowerCase()
      );
      if (!existing) {
        peopleMap.set(p.id, p);
      } else {
        // Merge balances
        peopleMap.set(existing.id, {
          ...existing,
          ...p,
          balance: p.balance !== undefined ? p.balance : existing.balance,
        });
      }
    }
  });
  const mergedPeople = Array.from(peopleMap.values());

  // 3. Merge ledger entries per person by ID (excluding deleted entries)
  const mergedLedgerEntries: Record<string, LedgerEntry[]> = {};
  const allPersonIds = new Set([
    ...Object.keys(remote.ledgerEntries || {}),
    ...Object.keys(local.ledgerEntries || {}),
  ]);

  allPersonIds.forEach((pId) => {
    if (allDeletedPersonIds.has(pId)) return;
    const entryMap = new Map<string, LedgerEntry>();
    ((remote.ledgerEntries && remote.ledgerEntries[pId]) || []).forEach((e) => {
      if (!allDeletedEntryIds.has(e.id)) {
        entryMap.set(e.id, e);
      }
    });
    ((local.ledgerEntries && local.ledgerEntries[pId]) || []).forEach((e) => {
      if (!allDeletedEntryIds.has(e.id)) {
        entryMap.set(e.id, e);
      }
    });
    mergedLedgerEntries[pId] = Array.from(entryMap.values()).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
  });

  const latestTime = Math.max(local.lastModified || 0, remote.lastModified || 0, Date.now());

  return {
    version: 1,
    lastModified: latestTime,
    userId,
    transactions: mergedTransactions,
    people: mergedPeople,
    ledgerEntries: mergedLedgerEntries,
    deletedTxIds: Array.from(allDeletedTxIds),
    deletedPersonIds: Array.from(allDeletedPersonIds),
    deletedEntryIds: Array.from(allDeletedEntryIds),
  };
}

/**
 * Extract human-readable error from Google Drive API response
 */
async function parseDriveApiError(res: Response, defaultMsg: string): Promise<Error> {
  const errBody = await res.json().catch(() => null);
  const errMsg: string = errBody?.error?.message || '';

  if (res.status === 401) {
    return new Error('Google Drive session expired. Please tap "Link Drive" to sign in again.');
  }

  if (res.status === 403) {
    if (
      errMsg.toLowerCase().includes('drive api') ||
      errMsg.toLowerCase().includes('not been used') ||
      errMsg.toLowerCase().includes('disabled') ||
      errMsg.toLowerCase().includes('accessnotconfigured')
    ) {
      return new Error(
        'Google Drive API was just enabled or is propagating. Please wait 1-2 minutes and tap sync again.'
      );
    }

    if (
      errMsg.toLowerCase().includes('insufficient') ||
      errMsg.toLowerCase().includes('scope') ||
      errMsg.toLowerCase().includes('permission')
    ) {
      return new Error(
        'Google Drive permission missing. Please tap "Link Drive" to sign in again and ensure the Google Drive checkbox is checked on the consent screen.'
      );
    }

    return new Error(
      `Google Drive access denied (403): ${errMsg || 'Check that API restrictions allow Google Drive API.'}`
    );
  }

  return new Error(`${defaultMsg} (${res.status}): ${errMsg}`);
}

/**
 * Find the Ledgerly vault file on user's Google Drive
 */
async function findVaultFile(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const query = encodeURIComponent(`name = '${VAULT_FILE_NAME}' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${query}&fields=files(id,name,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw await parseDriveApiError(res, 'Google Drive lookup failed');
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

/**
 * Download the raw vault file content
 */
async function readVaultFile(fileId: string, token: string): Promise<VaultPayload> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw await parseDriveApiError(res, 'Failed to download vault from Google Drive');
  }

  return await res.json();
}

/**
 * Upload or update the vault file in Google Drive
 */
async function writeVaultFile(
  payload: VaultPayload,
  token: string,
  existingFileId?: string
): Promise<string> {
  const fileContent = JSON.stringify(payload, null, 2);

  if (existingFileId) {
    // Update existing file content via PATCH upload
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      }
    );

    if (!res.ok) {
      throw await parseDriveApiError(res, 'Failed to update Drive vault');
    }

    const result = await res.json();
    return result.id || existingFileId;
  } else {
    // Create new file via multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: VAULT_FILE_NAME,
      mimeType: 'application/json',
      description: 'Ledgerly Personal Finance Sync File - Do not edit manually',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      throw await parseDriveApiError(res, 'Failed to create Drive vault');
    }

    const result = await res.json();
    return result.id;
  }
}

/**
 * Non-destructive Bi-directional Smart Sync:
 * Combines PC and Mobile records so neither overwrites the other.
 */
export async function syncVaultWithGoogleDrive(
  token: string,
  userId: string,
  forceDirection?: 'push' | 'pull'
): Promise<{ action: 'pushed' | 'pulled' | 'synced' }> {
  try {
    updateSyncState('syncing');

    const fileMeta = await findVaultFile(token);
    const localPayload = exportLocalVault(userId);

    if (!fileMeta) {
      // Remote file doesn't exist yet on Google Drive, create it
      await writeVaultFile(localPayload, token);
      updateSyncState('synced');
      return { action: 'pushed' };
    }

    if (forceDirection === 'push') {
      await writeVaultFile(localPayload, token, fileMeta.id);
      updateSyncState('synced');
      return { action: 'pushed' };
    }

    // Read the remote vault from Google Drive
    const remotePayload = await readVaultFile(fileMeta.id, token);

    if (forceDirection === 'pull') {
      importRemoteVault(remotePayload, userId);
      updateSyncState('synced');
      return { action: 'pulled' };
    }

    // Smart Union Merge: Merge local & remote records without dropping any transactions
    const merged = mergeVaults(localPayload, remotePayload, userId);

    // Apply merged payload to local storage
    importRemoteVault(merged, userId);

    // Always update Drive with the unified state if there were differences
    await writeVaultFile(merged, token, fileMeta.id);

    updateSyncState('synced');
    return { action: 'synced' };
  } catch (err: any) {
    console.error('Drive Sync Error:', err);
    updateSyncState('error', err?.message || 'Sync failed');
    throw err;
  }
}
