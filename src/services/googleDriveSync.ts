import { SpendingTransaction, Person, LedgerEntry } from '../types';

export interface VaultPayload {
  version: number;
  lastModified: number;
  userId: string;
  transactions: SpendingTransaction[];
  people: Person[];
  ledgerEntries: Record<string, LedgerEntry[]>; // personId -> entries
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unlinked';

const VAULT_FILE_NAME = 'ledgerly_personal_vault.json';
const DRIVE_SYNC_EVENT = 'ledgerly_drive_sync_change';

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

export function subscribeSyncState(callback: (state: { status: SyncStatus; lastSyncTimestamp: number | null; error: string | null }) => void) {
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

  return {
    version: 1,
    lastModified: Date.now(),
    userId,
    transactions,
    people,
    ledgerEntries,
  };
}

/**
 * Apply remote Vault payload into local storage and notify UI
 */
export function importRemoteVault(payload: VaultPayload, userId: string) {
  const txKey = userId.startsWith('demo-') ? 'ledgerly_demo_transactions' : `ledgerly_tx_${userId}`;
  const peopleKey = userId.startsWith('demo-') ? 'ledgerly_demo_people' : `ledgerly_people_${userId}`;

  // Save transactions & people
  localStorage.setItem(txKey, JSON.stringify(payload.transactions || []));
  localStorage.setItem(peopleKey, JSON.stringify(payload.people || []));

  // Save ledger entries
  if (payload.ledgerEntries) {
    Object.entries(payload.ledgerEntries).forEach(([personId, entries]) => {
      const entryKey = userId.startsWith('demo-')
        ? `ledgerly_demo_entries_${personId}`
        : `ledgerly_entries_${userId}_${personId}`;
      localStorage.setItem(entryKey, JSON.stringify(entries || []));
    });
  }

  // Trigger UI updates
  window.dispatchEvent(new CustomEvent('ledgerly_data_change'));
}

/**
 * Find the Ledgerly vault file on user's Google Drive
 */
async function findVaultFile(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const query = encodeURIComponent(`name = '${VAULT_FILE_NAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google Drive access expired. Please sign in again.');
    }
    throw new Error(`Google Drive lookup failed (${res.status})`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

/**
 * Read the vault JSON file content from Google Drive
 */
async function readVaultFile(fileId: string, token: string): Promise<VaultPayload> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download vault from Google Drive (${res.status})`);
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
      throw new Error(`Failed to update Drive vault (${res.status})`);
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
      throw new Error(`Failed to create Drive vault (${res.status})`);
    }

    const result = await res.json();
    return result.id;
  }
}

/**
 * Bi-directional Smart Sync:
 * 1. If remote file exists: compare local modified time vs remote file.
 *    - If remote is newer, download and merge into local.
 *    - If local is newer, upload local state to remote.
 * 2. If remote does not exist: upload local state to create it.
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
      // Remote doesn't exist yet, upload local
      await writeVaultFile(localPayload, token);
      updateSyncState('synced');
      return { action: 'pushed' };
    }

    if (forceDirection === 'push') {
      await writeVaultFile(localPayload, token, fileMeta.id);
      updateSyncState('synced');
      return { action: 'pushed' };
    }

    // Download remote payload to compare
    const remotePayload = await readVaultFile(fileMeta.id, token);

    if (forceDirection === 'pull') {
      importRemoteVault(remotePayload, userId);
      updateSyncState('synced');
      return { action: 'pulled' };
    }

    // Determine which is newer
    const remoteTime = remotePayload.lastModified || new Date(fileMeta.modifiedTime).getTime() || 0;
    const localTime = localPayload.lastModified || 0;

    // If remote has more transactions or is newer, import remote
    const remoteTxCount = remotePayload.transactions?.length || 0;
    const localTxCount = localPayload.transactions?.length || 0;

    if (remoteTxCount > 0 && (localTxCount === 0 || remoteTime > localTime + 2000)) {
      importRemoteVault(remotePayload, userId);
      updateSyncState('synced');
      return { action: 'pulled' };
    } else {
      // Local is newer or has newer edits, push to Drive
      await writeVaultFile(localPayload, token, fileMeta.id);
      updateSyncState('synced');
      return { action: 'pushed' };
    }
  } catch (err: any) {
    console.error('Drive Sync Error:', err);
    updateSyncState('error', err?.message || 'Sync failed');
    throw err;
  }
}
