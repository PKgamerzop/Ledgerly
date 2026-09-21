import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { updateTransaction, deleteTransaction } from '../db/storage';
import { SpendingTransaction, TransactionType } from '../types';
import { X, Trash2, AlertCircle, Calendar, Tag, TrendingDown, TrendingUp, BookOpen, PenTool } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: SpendingTransaction;
  onClose: () => void;
}

const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Health & Care',
  'Salary & Income',
  'Refund',
  'Cash Back',
  'Gift',
  'Loan Repayment',
  'General',
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  onClose,
}) => {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [type, setType] = useState<TransactionType>(transaction.type || 'spent');
  const [amount, setAmount] = useState<string>(transaction.amount.toString());
  const [reason, setReason] = useState<string>(transaction.reason);
  const [date, setDate] = useState<string>(transaction.date);
  const [category, setCategory] = useState<string>(transaction.category || 'General');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Amount must be a positive number greater than 0.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please provide a reason or account note.');
      return;
    }

    try {
      setSubmitting(true);
      await updateTransaction(user.uid, transaction.id, {
        amount: parsedAmount,
        type,
        reason: reason.trim(),
        date,
        category,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update transaction:', err);
      setErrorMessage('Failed to amend transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    try {
      setDeleting(true);
      await deleteTransaction(user.uid, transaction.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setErrorMessage('Failed to void transaction.');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f100a]/65 backdrop-blur-xs">
      <div className="vintage-card max-w-lg w-full overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#85261c] via-[#c59b27] to-[#265c3b]"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dfd1bd] bg-[#f4ede1]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#85261c]" />
            <h3 className="font-serif text-base font-bold text-[#24140a]">
              Amend Journal Folio Entry
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7d6350] hover:text-[#24140a] hover:bg-[#ede2ce] transition cursor-pointer border border-[#cfbeaa]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-[#fbf0ee] border border-[#e8b6b0] text-[#a63428] text-xs rounded-xl font-medium">
              <AlertCircle className="w-4 h-4 text-[#a63428] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Transaction Type: Spent vs Received */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-1.5">
              Folio Column
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('spent')}
                className={`py-2 px-3 flex items-center justify-center gap-2 cursor-pointer font-serif text-xs font-bold rounded-xl border transition ${
                  type === 'spent'
                    ? 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0] shadow-xs'
                    : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0] hover:bg-[#faf4ea]'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-[#a63428]" />
                <span>Debit (Red Ink Deduction)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('received')}
                className={`py-2 px-3 flex items-center justify-center gap-2 cursor-pointer font-serif text-xs font-bold rounded-xl border transition ${
                  type === 'received'
                    ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4] shadow-xs'
                    : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0] hover:bg-[#faf4ea]'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#265c3b]" />
                <span>Credit (Green Ink Receipt)</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-1.5">
              Amount ({currency}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-serif font-bold text-base text-[#8c7361] select-none">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 font-serif text-lg font-bold bg-[#ffffff] border rounded-xl outline-none transition tabular-nums shadow-2xs ${
                  type === 'spent'
                    ? 'text-[#a63428] border-[#cfbeaa] focus:border-[#a63428]'
                    : 'text-[#265c3b] border-[#cfbeaa] focus:border-[#265c3b]'
                }`}
              />
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-1.5">
              Reason / Account Note *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#8c7361] absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none transition shadow-2xs"
              />
            </div>
          </div>

          {/* Date & Category in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#8c7361] absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-serif text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none transition shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs font-serif text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] outline-none transition shadow-2xs cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#dfd1bd] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`w-full sm:w-auto px-3.5 py-2 font-serif text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                confirmingDelete
                  ? 'bg-[#85261c] text-white border-[#85261c]'
                  : 'text-[#a63428] border-[#e8b6b0] hover:bg-[#fbf0ee]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmingDelete ? 'Confirm Void Entry?' : 'Void Entry'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 font-serif text-xs font-bold rounded-xl border border-[#cfbeaa] text-[#6e5340] hover:bg-[#f4ede1] cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-initial px-4 py-2 font-serif text-xs font-bold rounded-xl btn-leather transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <PenTool className="w-3.5 h-3.5 text-white" />
                    <span>Save Amendments</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
