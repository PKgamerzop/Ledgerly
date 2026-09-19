import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  subscribePersonEntries,
  addLedgerEntry,
  deleteLedgerEntry,
  deletePerson,
} from '../firebase/db';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Person details and net balance */}
        <div className="bg-gradient-to-r from-[#0c3744] to-[#145668] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 text-teal-200 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black">{person.name}</h3>
              {person.phone && (
                <p className="text-xs text-teal-200 mt-0.5">📞 {person.phone}</p>
              )}
              {person.notes && (
                <p className="text-xs text-teal-100/80 mt-1 italic">"{person.notes}"</p>
              )}
            </div>

            {/* Net Balance Pill */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-200 block">
                Net Balance
              </span>
              <div className="text-xl sm:text-2xl font-black">
                {isOwedToMe ? (
                  <span className="text-emerald-300">
                    +{formatCurrency(person.balance, currency)}
                  </span>
                ) : isOwedByMe ? (
                  <span className="text-amber-300">
                    -{formatCurrency(Math.abs(person.balance), currency)}
                  </span>
                ) : (
                  <span className="text-emerald-200 font-bold">Settled ($0.00)</span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-white/90">
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
          <div className="bg-emerald-600 text-white px-5 py-3 text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Zero Balance / Settled Banner */}
          {isZeroBalance && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-teal-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <div className="font-bold text-xs">All Debts Settled ($0.00)</div>
                  <div className="text-[11px] text-teal-700">There is no money to give or take for {person.name}.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeletePerson}
                disabled={deletingPerson}
                className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <UserMinus className="w-4 h-4" />
                <span>Remove Person</span>
              </button>
            </div>
          )}

          {/* Settle Full Balance Shortcut */}
          {!isZeroBalance && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Settle Remaining Balance ({formatCurrency(Math.abs(person.balance), currency)})</span>
                </div>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  {isOwedToMe
                    ? 'Clear all money to take and remove person from active list'
                    : 'Clear all money to give and remove person from active list'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettleFullAndRemove}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-[#0c3744] hover:bg-[#124b5d] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Settle & Remove Person</span>
              </button>
            </div>
          )}

          {/* Add or Adjust Money Form */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-teal-700" />
                Adjust Money (Give / Take / Repay)
              </h4>
            </div>

            {errorMessage && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
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
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'repay_take'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span className="text-[11px] leading-tight">Remove Money to Take (They Paid Me)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('repay_give');
                  if (isOwedByMe) setAmount(Math.abs(person.balance).toFixed(2));
                  setReason('Debt paid back');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'repay_give'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span className="text-[11px] leading-tight">Remove Money to Give (I Paid Them)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('lent_more');
                  setAmount('');
                  setReason('');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'lent_more'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-[11px] leading-tight">Add Money to Take (I Lent More)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('borrowed_more');
                  setAmount('');
                  setReason('');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  entryMode === 'borrowed_more'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] leading-tight">Add Money to Give (I Borrowed)</span>
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Reason / Description *
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Checkbox: Remove person if balance reaches 0 */}
              <div className="sm:col-span-2 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoRemoveWhenZero}
                    onChange={(e) => setAutoRemoveWhenZero(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span>Remove person automatically if balance reaches $0.00</span>
                </label>
                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                  Recommended
                </span>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#0c3744] hover:bg-[#124b5d] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-300" />
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
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Ledger Transaction History ({entries.length})
              </span>
            </h4>

            {loadingEntries ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No ledger transactions recorded with {person.name} yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {entries.map((item) => {
                  const isSettlement = item.type === 'settlement';
                  const isLent = item.type === 'give';

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl mt-0.5 ${
                            isSettlement
                              ? 'bg-teal-50 text-teal-700'
                              : isLent
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
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
                          <div className="font-bold text-slate-900">{item.reason}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{formatDateDisplay(item.date)}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">
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
                          className={`font-black text-sm ${
                            isSettlement
                              ? 'text-teal-700'
                              : isLent
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {formatCurrency(item.amount, currency)}
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(item)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition cursor-pointer"
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDeletePerson}
            disabled={deletingPerson}
            className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 text-xs font-bold transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove {person.name}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
