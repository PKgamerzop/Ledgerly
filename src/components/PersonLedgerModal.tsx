import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  subscribePersonEntries,
  addLedgerEntry,
  deleteLedgerEntry,
  deletePerson,
  calculateBalanceFromEntries,
} from '../db/storage';
import { Person, LedgerEntry, LedgerEntryType } from '../types';
import { formatCurrency, formatDateDisplay, getTodayDateString } from '../utils/formatters';
import {
  X,
  PlusCircle,
  Trash2,
  Calendar,
  AlertCircle,
  BookOpen,
  UserMinus,
  Check,
  TrendingDown,
  TrendingUp,
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

  // Calculate dynamic, live accurate balance from all recorded entries
  const currentBalance = useMemo(() => {
    if (entries.length > 0) {
      return calculateBalanceFromEntries(entries);
    }
    return person.balance || 0;
  }, [entries, person.balance]);

  const isOwedToMe = currentBalance > 0.009;
  const isOwedByMe = currentBalance < -0.009;
  const isZeroBalance = Math.abs(currentBalance) < 0.01;

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
      setErrorMessage('Please enter an entry reason or description.');
      return;
    }

    try {
      setSubmitting(true);

      let type: LedgerEntryType = 'settlement';
      let direction: 'to_take' | 'to_give' = 'to_take';

      if (entryMode === 'repay_take') {
        type = 'settlement';
        direction = 'to_take';
      } else if (entryMode === 'repay_give') {
        type = 'settlement';
        direction = 'to_give';
      } else if (entryMode === 'lent_more') {
        type = 'give';
        direction = 'to_take';
      } else if (entryMode === 'borrowed_more') {
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
        setSuccessMessage(`The balance for ${person.name} is settled and balanced at 0.00.`);
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
    try {
      await deleteLedgerEntry(user.uid, person.id, entry.id, {
        amount: entry.amount,
        type: entry.type,
        direction: entry.direction,
      });
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setErrorMessage('Could not void entry. Please check your connection.');
    }
  };

  const handleDeletePerson = async () => {
    if (!user) return;
    try {
      setDeletingPerson(true);
      await deletePerson(user.uid, person.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete person:', err);
      setErrorMessage('Failed to close account.');
      setDeletingPerson(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1f100a]/65 backdrop-blur-xs overflow-y-auto">
      <div className="vintage-card max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#85261c] via-[#c59b27] to-[#265c3b]"></div>

        {/* Modal Header */}
        <div className="bg-[#f4ede1] border-b border-[#dfd1bd] p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7d6350] hover:text-[#24140a] hover:bg-[#ede2ce] transition absolute right-5 top-5 cursor-pointer border border-[#cfbeaa]"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#ffffff] border border-[#cfbeaa] text-[#4a2c1d] flex items-center justify-center font-serif text-xl font-bold shadow-2xs">
                {person.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#24140a]">
                    {person.name}
                  </h3>
                  <span className="text-[11px] font-serif text-[#6e5340] bg-[#ffffff] px-2 py-0.5 rounded border border-[#dfd1bd]">
                    Folio Account
                  </span>
                </div>
                {person.phone && (
                  <p className="text-xs text-[#7d6350] mt-0.5 font-serif">{person.phone}</p>
                )}
              </div>
            </div>

            {/* Current Balance */}
            <div className="text-left sm:text-right font-serif">
              <div className="text-[11px] font-bold text-[#7d6350] uppercase tracking-wider">
                {isOwedToMe
                  ? 'Receivable Balance'
                  : isOwedByMe
                  ? 'Payable Balance'
                  : 'Account Balance'}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                  isOwedToMe
                    ? 'text-[#265c3b]'
                    : isOwedByMe
                    ? 'text-[#a63428]'
                    : 'text-[#6e5340]'
                }`}
              >
                {formatCurrency(Math.abs(currentBalance), currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-[#fbf0ee] border border-[#e8b6b0] text-[#a63428] text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-[#eff7f1] border border-[#b9deb4] text-[#265c3b] text-xs font-serif font-semibold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* New Ledger Entry Form */}
          <div className="bg-[#ffffff] border border-[#cfbeaa] rounded-2xl p-4 sm:p-5 shadow-2xs">
            <h4 className="font-serif text-sm font-bold text-[#24140a] mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#85261c]" />
              <span>Ink New Folio Transaction</span>
            </h4>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-serif text-xs">
              {isOwedToMe && (
                <button
                  type="button"
                  onClick={() => setEntryMode('repay_take')}
                  className={`py-2 px-2 rounded-xl font-bold border transition text-center ${
                    entryMode === 'repay_take'
                      ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4] shadow-xs'
                      : 'bg-[#f7f3eb] text-[#6e5340] border-[#d8c7b0]'
                  }`}
                >
                  Repaid Me
                </button>
              )}

              {isOwedByMe && (
                <button
                  type="button"
                  onClick={() => setEntryMode('repay_give')}
                  className={`py-2 px-2 rounded-xl font-bold border transition text-center ${
                    entryMode === 'repay_give'
                      ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4] shadow-xs'
                      : 'bg-[#f7f3eb] text-[#6e5340] border-[#d8c7b0]'
                  }`}
                >
                  I Paid Back
                </button>
              )}

              <button
                type="button"
                onClick={() => setEntryMode('lent_more')}
                className={`py-2 px-2 rounded-xl font-bold border transition text-center ${
                  entryMode === 'lent_more'
                    ? 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0] shadow-xs'
                    : 'bg-[#f7f3eb] text-[#6e5340] border-[#d8c7b0]'
                }`}
              >
                Lent More
              </button>

              <button
                type="button"
                onClick={() => setEntryMode('borrowed_more')}
                className={`py-2 px-2 rounded-xl font-bold border transition text-center ${
                  entryMode === 'borrowed_more'
                    ? 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0] shadow-xs'
                    : 'bg-[#f7f3eb] text-[#6e5340] border-[#d8c7b0]'
                }`}
              >
                Borrowed More
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
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
                    className="w-full px-3 py-2 text-sm tabular-nums font-serif font-bold text-[#24140a] bg-[#f7f3eb] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#24140a] bg-[#f7f3eb] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs font-serif"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1">
                  Reason / Description *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Bank transfer, Cash settlement, Dinner split"
                  className="w-full px-3 py-2 text-xs text-[#24140a] bg-[#f7f3eb] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#6e5340] font-serif">
                  <input
                    type="checkbox"
                    checked={autoRemoveWhenZero}
                    onChange={(e) => setAutoRemoveWhenZero(e.target.checked)}
                    className="rounded border-[#cfbeaa] text-[#6b4028] focus:ring-[#6b4028]"
                  />
                  <span>Close and archive counterparty if balance settles to 0.00</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-leather font-serif px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Commit to Folio</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Audit History of Ledger Entries */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-serif text-sm font-bold text-[#24140a]">
                Account Transaction Register
              </h4>
              <span className="text-xs font-serif text-[#7d6350]">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} &#8226; Net Total:{' '}
                <strong className={isOwedToMe ? 'text-[#265c3b]' : isOwedByMe ? 'text-[#a63428]' : 'text-[#6e5340]'}>
                  {formatCurrency(Math.abs(currentBalance), currency)}
                </strong>
              </span>
            </div>

            {loadingEntries ? (
              <div className="py-8 text-center text-xs text-[#7d6350] font-serif">
                Reviewing register entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="p-6 bg-[#f7f3eb] rounded-2xl border border-[#dfd1bd] text-center text-xs text-[#7d6350] font-serif italic">
                No transactions recorded for this counterparty yet.
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const isGive = entry.type === 'give';
                  const isTake = entry.type === 'take';
                  const isSettlement = entry.type === 'settlement';
                  const isRepaidMe = isSettlement && entry.direction === 'to_take';
                  const isPaidBack = isSettlement && entry.direction === 'to_give';

                  const badgeText = isGive
                    ? 'Lent Advance'
                    : isTake
                    ? 'Borrowed'
                    : isRepaidMe
                    ? 'Repaid Me'
                    : isPaidBack
                    ? 'Paid Back'
                    : 'Settlement';

                  const isPositiveDelta = isGive || isPaidBack;
                  const sign = isPositiveDelta ? '+' : '-';
                  const amountColor = isPositiveDelta ? 'text-[#265c3b]' : 'text-[#a63428]';

                  return (
                    <div
                      key={entry.id}
                      className="p-3 bg-[#ffffff] border border-[#dfd1bd] rounded-xl flex items-center justify-between text-xs hover:border-[#cfbeaa] transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-serif font-bold px-1.5 py-0.2 rounded border ${
                              isPositiveDelta
                                ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4]'
                                : 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0]'
                            }`}
                          >
                            {badgeText}
                          </span>
                          <span className="font-serif font-semibold text-[#24140a]">{entry.reason}</span>
                        </div>
                        <div className="text-[11px] text-[#7d6350] mt-0.5 font-serif italic">
                          {formatDateDisplay(entry.date)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-serif">
                        <span
                          className={`text-sm font-bold tabular-nums ${amountColor}`}
                        >
                          {sign}
                          {formatCurrency(entry.amount, currency)}
                        </span>

                        <button
                          onClick={() => handleDeleteEntry(entry)}
                          className="p-1 text-[#a89584] hover:text-[#a63428] transition cursor-pointer"
                          title="Void entry"
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

          {/* Close Account Permanently */}
          <div className="pt-3 border-t border-[#dfd1bd] flex justify-between items-center text-xs">
            <span className="text-[#8c7361] font-serif italic">
              Close counterparty record permanently
            </span>
            <button
              type="button"
              onClick={handleDeletePerson}
              disabled={deletingPerson}
              className="px-3 py-1.5 rounded-xl border border-[#e8b6b0] text-[#a63428] hover:bg-[#fbf0ee] font-serif font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>{deletingPerson ? 'Closing...' : 'Close Account'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
