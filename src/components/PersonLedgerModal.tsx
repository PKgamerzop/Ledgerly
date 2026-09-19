import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  subscribePersonEntries,
  addLedgerEntry,
  deleteLedgerEntry,
  deletePerson,
} from '../db/storage';
import { Person, LedgerEntry, LedgerEntryType } from '../types';
import { formatCurrency, formatDateDisplay, getTodayDateString } from '../utils/formatters';
import {
  X,
  PlusCircle,
  CheckCircle2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  Calendar,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
  UserMinus,
  Check,
} from 'lucide-react';

interface PersonLedgerModalProps {
  person: Person;
  onClose: () => void;
}

export const PersonLedgerModal: React.FC<PersonLedgerModalProps> = ({ person, onClose }) => {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(true);

  // Form State: options to adjust money to take or give
  // 'repay_take': They paid me back (reduces money to take)
  // 'repay_give': I paid them back (reduces money to give)
  // 'lent_more': I lent more money (increases money to take)
  // 'borrowed_more': I borrowed more money (increases money to give)
  const defaultMode = person.balance > 0 ? 'repay_take' : person.balance < 0 ? 'repay_give' : 'lent_more';
  const [entryMode, setEntryMode] = useState<'repay_take' | 'repay_give' | 'lent_more' | 'borrowed_more'>(defaultMode);
  
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [autoRemoveWhenZero, setAutoRemoveWhenZero] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Subscribe to ledger entries
  useEffect(() => {
    if (!user) return;
    setLoadingEntries(true);
    const unsubscribe = subscribePersonEntries(
      user.uid,
      person.id,
      (data) => {
        setEntries(data);
        setLoadingEntries(false);
      },
      () => setLoadingEntries(false)
    );

    return () => unsubscribe();
  }, [user, person.id]);

  const isOwedToMe = person.balance > 0.009;
  const isOwedByMe = person.balance < -0.009;
  const isZeroBalance = Math.abs(person.balance || 0) < 0.01;

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Amount must be a positive number greater than 0.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please enter a description or reason.');
      return;
    }

    try {
      setSubmitting(true);

      let type: LedgerEntryType = 'settlement';
      let direction: 'to_take' | 'to_give' = 'to_take';

      if (entryMode === 'repay_take') {
        // They paid me back => reduces money to take
        type = 'settlement';
        direction = 'to_take';
      } else if (entryMode === 'repay_give') {
        // I paid them back => reduces money to give
        type = 'settlement';
        direction = 'to_give';
      } else if (entryMode === 'lent_more') {
        // I gave money to them => increases money to take
        type = 'give';
        direction = 'to_take';
      } else if (entryMode === 'borrowed_more') {
        // I took money from them => increases money to give
        type = 'take';
        direction = 'to_give';
      }

      const result = await addLedgerEntry(
        user.uid,
        person.id,
        {
          amount: parsedAmount,
          type,
          direction,
          reason: reason.trim(),
          date,
        },
        autoRemoveWhenZero
      );

      if (result.personRemoved) {
        setSuccessMessage(`${person.name} is fully settled and removed from people list.`);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      // Clear form if not removed
      setAmount('');
      setReason('');
    } catch (err) {
      console.error('Failed to add ledger entry:', err);
      setErrorMessage('Failed to add transaction. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entry: LedgerEntry) => {
    if (!user) return;
    const confirm = window.confirm(`Delete entry "${entry.reason}"? This will reverse the balance.`);
    if (!confirm) return;

    try {
      await deleteLedgerEntry(user.uid, person.id, entry.id, {
        amount: entry.amount,
        type: entry.type,
        direction: entry.direction,
      });
    } catch (err) {
      console.error('Failed to delete ledger entry:', err);
      alert('Could not delete entry.');
    }
  };

  const handleDeletePerson = async () => {
    if (!user) return;
    const confirm = window.confirm(
      `Are you sure you want to remove ${person.name} from your people list?`
    );
    if (!confirm) return;

    try {
      setDeletingPerson(true);
      await deletePerson(user.uid, person.id);
      onClose();
    } catch (err) {
      console.error('Failed to remove person:', err);
      alert('Could not remove person.');
      setDeletingPerson(false);
    }
  };

  // 1-Click: Settle full balance and remove person immediately
  const handleSettleFullAndRemove = async () => {
    if (!user) return;
    const absBal = Math.abs(person.balance);
    if (absBal <= 0) {
      await handleDeletePerson();
      return;
    }

    const direction: 'to_take' | 'to_give' = person.balance > 0 ? 'to_take' : 'to_give';
    const actionDesc = person.balance > 0 ? 'Received full repayment' : 'Paid back in full';

    try {
      setSubmitting(true);
      await addLedgerEntry(
        user.uid,
        person.id,
        {
          amount: absBal,
          type: 'settlement',
          direction,
          reason: `${actionDesc} (Settled)`,
          date: getTodayDateString(),
        },
        true // removeIfZero = true
      );

      setSuccessMessage(`${person.name} is fully settled ($0.00) and removed.`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to settle and remove person:', err);
      setErrorMessage('Could not complete settlement. Please retry.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="mc-panel max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] p-0">
        {/* Header with Person details and net balance */}
        <div className="bg-[#1c1814] border-b-2 border-[#120f0c] text-white p-6 relative">
          <button
            onClick={onClose}
            className="mc-button absolute right-4 top-4 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6">
            <div>
              <h3 className="font-pixel text-xl sm:text-2xl text-[#ffd700] drop-shadow-[2px_2px_0_#000]">
                {person.name}
              </h3>
              {person.phone && (
                <p className="font-mc text-xs text-[#a0a0a0] mt-0.5">📞 {person.phone}</p>
              )}
              {person.notes && (
                <p className="font-mc text-xs text-[#888888] mt-1 italic">"{person.notes}"</p>
              )}
            </div>

            {/* Net Balance Pill */}
            <div className="bg-[#161310] border-2 border-black p-3 text-right shadow-[inset_1px_1px_0_#2b241e,inset_-1px_-1px_0_#0a0806]">
              <span className="font-pixel text-[10px] uppercase tracking-wider text-[#888888] block">
                Net Balance
              </span>
              <div className="font-pixel text-xl sm:text-2xl">
                {isOwedToMe ? (
                  <span className="text-[#55ff55]">
                    +{formatCurrency(person.balance, currency)}
                  </span>
                ) : isOwedByMe ? (
                  <span className="text-[#ffaa00]">
                    -{formatCurrency(Math.abs(person.balance), currency)}
                  </span>
                ) : (
                  <span className="text-[#55ff55]">Settled ($0.00)</span>
                )}
              </div>
              <span className="font-mc text-[11px] text-[#aaaaaa]">
                {isOwedToMe
                  ? 'Owes you (Money to Take)'
                  : isOwedByMe
                  ? 'You owe (Money to Give)'
                  : '0 money to give or take'}
              </span>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="bg-[#1b3d1b] border-y-2 border-black text-[#55ff55] px-5 py-3 font-pixel text-xs flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#2b2520]">
          {/* Zero Balance / Settled Banner */}
          {isZeroBalance && (
            <div className="mc-panel bg-[#1a281a] border-2 border-[#0f1f0f] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#55ff55]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#55ff55] shrink-0" />
                <div>
                  <div className="font-pixel text-xs text-[#55ff55]">All Debts Settled ($0.00)</div>
                  <div className="font-mc text-[11px] text-[#a0cca0]">There is no money to give or take for {person.name}.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeletePerson}
                disabled={deletingPerson}
                className="mc-button mc-button-emerald px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserMinus className="w-4 h-4" />
                <span>Remove Person</span>
              </button>
            </div>
          )}

          {/* Settle Full Balance Shortcut */}
          {!isZeroBalance && (
            <div className="mc-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="font-pixel text-xs text-[#ffd700] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#ffd700]" />
                  <span>Settle Remaining Balance ({formatCurrency(Math.abs(person.balance), currency)})</span>
                </div>
                <p className="font-mc text-[11px] text-[#888888] mt-0.5">
                  {isOwedToMe
                    ? 'Clear all money to take and remove person from active list'
                    : 'Clear all money to give and remove person from active list'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettleFullAndRemove}
                disabled={submitting}
                className="mc-button mc-button-emerald w-full sm:w-auto px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-[#55ff55]" />
                <span>Settle & Remove</span>
              </button>
            </div>
          )}

          {/* Add or Adjust Money Form */}
          <div className="mc-panel p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-[#55ff55]" />
                Adjust Money (Give / Take / Repay)
              </h4>
            </div>

            {errorMessage && (
              <div className="mb-3 flex items-start gap-2 p-3 mc-panel bg-[#4a1414] border-2 border-[#1a0505] text-[#ff6b6b] text-xs">
                <AlertCircle className="w-4 h-4 text-[#ff4444] shrink-0 mt-0.5" />
                <span className="font-mc">{errorMessage}</span>
              </div>
            )}

            {/* Mode selection buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setEntryMode('repay_take');
                  if (isOwedToMe) setAmount(person.balance.toFixed(2));
                  setReason('Repayment received');
                }}
                className={`p-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'repay_take'
                    ? 'mc-button mc-button-emerald'
                    : 'mc-button'
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span className="font-mc text-[10px] leading-tight">Remove to Take (They Paid)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('repay_give');
                  if (isOwedByMe) setAmount(Math.abs(person.balance).toFixed(2));
                  setReason('Debt paid back');
                }}
                className={`p-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'repay_give'
                    ? 'mc-button mc-button-emerald'
                    : 'mc-button'
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span className="font-mc text-[10px] leading-tight">Remove to Give (I Paid)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('lent_more');
                  setAmount('');
                  setReason('');
                }}
                className={`p-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'lent_more'
                    ? 'mc-button mc-button-emerald'
                    : 'mc-button'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="font-mc text-[10px] leading-tight">Add to Take (I Lent More)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('borrowed_more');
                  setAmount('');
                  setReason('');
                }}
                className={`p-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'borrowed_more'
                    ? 'mc-button mc-button-redstone'
                    : 'mc-button'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span className="font-mc text-[10px] leading-tight">Add to Give (I Borrowed)</span>
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-pixel text-[11px] text-[#ffd700] uppercase tracking-wider mb-1">
                  Amount ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mc-input w-full px-3 py-2 text-xs text-[#ffffff] font-pixel placeholder:text-[#666666]"
                />
              </div>

              <div>
                <label className="block font-pixel text-[11px] text-[#ffd700] uppercase tracking-wider mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mc-input w-full pl-9 pr-3 py-2 text-xs text-[#ffffff]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-pixel text-[11px] text-[#ffd700] uppercase tracking-wider mb-1">
                  Reason / Description *
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      entryMode === 'repay_take'
                        ? 'e.g. Paid cash, UPI / bank transfer received'
                        : entryMode === 'repay_give'
                        ? 'e.g. Paid cash, Returned borrowed money'
                        : entryMode === 'lent_more'
                        ? 'e.g. Dinner split, Grocery bill, Travel ticket'
                        : 'e.g. Emergency cash loan, Shared expense'
                    }
                    className="mc-input w-full pl-9 pr-3 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
                  />
                </div>
              </div>

              {/* Checkbox: Remove person if balance reaches 0 */}
              <div className="sm:col-span-2 bg-[#1e1914] p-2.5 border-2 border-black flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-mc text-xs text-[#ffffff]">
                  <input
                    type="checkbox"
                    checked={autoRemoveWhenZero}
                    onChange={(e) => setAutoRemoveWhenZero(e.target.checked)}
                    className="w-4 h-4 accent-[#55ff55]"
                  />
                  <span>Remove person automatically if balance reaches $0.00</span>
                </label>
                <span className="mc-badge bg-[#1b3d1b] text-[#55ff55] px-2 py-0.5 text-[10px]">
                  Recommended
                </span>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="mc-button mc-button-emerald w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#55ff55]" />
                  <span>
                    {entryMode === 'repay_take'
                      ? 'Confirm Money Received (Reduce Money to Take)'
                      : entryMode === 'repay_give'
                      ? 'Confirm Money Paid (Reduce Money to Give)'
                      : entryMode === 'lent_more'
                      ? 'Add Money Lent (Increase Money to Take)'
                      : 'Add Money Borrowed (Increase Money to Give)'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Historical list of all transactions with this person */}
          <div>
            <h4 className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#888888]" />
                Ledger Transaction History ({entries.length})
              </span>
            </h4>

            {loadingEntries ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 mc-panel animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 font-mc text-xs text-[#888888] mc-panel">
                No ledger transactions recorded with {person.name} yet.
              </div>
            ) : (
              <div className="border-2 border-black divide-y-2 divide-[#16120e] bg-[#1a1612] overflow-hidden">
                {entries.map((item) => {
                  const isSettlement = item.type === 'settlement';
                  const isLent = item.type === 'give';

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-center justify-between hover:bg-[#221c17] transition text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 border border-black mt-0.5 ${
                            isSettlement
                              ? 'bg-[#1b3d1b] text-[#55ff55]'
                              : isLent
                              ? 'bg-[#1a381a] text-[#55ff55]'
                              : 'bg-[#3d2714] text-[#ffaa00]'
                          }`}
                        >
                          {isSettlement ? (
                            <HandCoins className="w-4 h-4" />
                          ) : isLent ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-[#ffffff] font-mc">{item.reason}</div>
                          <div className="text-[11px] text-[#888888] mt-0.5 flex items-center gap-2 font-mc">
                            <span>{formatDateDisplay(item.date)}</span>
                            <span>•</span>
                            <span className="text-[#aaaaaa]">
                              {isSettlement
                                ? item.direction === 'to_take'
                                  ? 'They paid back (Reduced money to take)'
                                  : 'You paid back (Reduced money to give)'
                                : isLent
                                ? 'You lent (Money to take)'
                                : 'You borrowed (Money to give)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-pixel text-sm ${
                            isSettlement
                              ? 'text-[#55ff55]'
                              : isLent
                              ? 'text-[#55ff55]'
                              : 'text-[#ffaa00]'
                          }`}
                        >
                          {formatCurrency(item.amount, currency)}
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(item)}
                          className="mc-button p-1.5 cursor-pointer text-[#ff5555]"
                          title="Delete entry (reverts balance)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t-2 border-[#15120e] bg-[#1e1914] flex items-center justify-between">
          <button
            type="button"
            onClick={handleDeletePerson}
            disabled={deletingPerson}
            className="mc-button mc-button-redstone flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove {person.name}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mc-button px-4 py-2 text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
