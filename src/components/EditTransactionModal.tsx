import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { updateTransaction, deleteTransaction } from '../db/storage';
import { SpendingTransaction, TransactionType } from '../types';
import { X, Trash2, CheckCircle2, AlertCircle, Calendar, Tag, TrendingDown, TrendingUp } from 'lucide-react';

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
      setErrorMessage('Please provide a reason or note.');
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
      setErrorMessage('Failed to update transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete "${transaction.reason}"?`);
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await deleteTransaction(user.uid, transaction.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setErrorMessage('Failed to delete transaction.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="mc-panel max-w-lg w-full overflow-hidden p-0">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#15120e] bg-[#1e1914]">
          <h3 className="font-pixel text-[#ffffff] text-base">Edit Transaction</h3>
          <button
            onClick={onClose}
            className="mc-button p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 mc-panel bg-[#4a1414] border-2 border-[#1a0505] text-[#ff6b6b] text-xs">
              <AlertCircle className="w-4 h-4 text-[#ff4444] shrink-0 mt-0.5" />
              <span className="font-mc">{errorMessage}</span>
            </div>
          )}

          {/* Transaction Type: Spent vs Received */}
          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('spent')}
                className={`py-2 px-3 flex items-center justify-center gap-2 cursor-pointer font-pixel text-xs transition ${
                  type === 'spent'
                    ? 'mc-button mc-button-redstone text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Spent</span>
              </button>

              <button
                type="button"
                onClick={() => setType('received')}
                className={`py-2 px-3 flex items-center justify-center gap-2 cursor-pointer font-pixel text-xs transition ${
                  type === 'received'
                    ? 'mc-button mc-button-emerald text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Received (- Subtract)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
              {type === 'spent' ? 'Amount Spent' : 'Amount Received'} ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mc-input w-full px-4 py-2.5 font-pixel text-lg text-[#ffffff] placeholder:text-[#666666]"
            />
          </div>

          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
              Reason / Description
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#888888] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mc-input w-full pl-10 pr-4 py-2.5 text-xs text-[#ffffff] placeholder:text-[#666666]"
              />
            </div>
          </div>

          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
              Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#888888] absolute left-3.5 top-3.5" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mc-input w-full pl-10 pr-4 py-2.5 text-xs text-[#ffffff] placeholder:text-[#666666]"
              />
            </div>
          </div>

          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mc-input w-full px-4 py-2.5 text-xs text-[#ffffff] bg-[#161310] cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#1e1914] text-[#ffffff]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-[#15120e]">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="mc-button mc-button-redstone flex items-center gap-1.5 px-3 py-2 text-xs font-bold cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="mc-button px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="mc-button mc-button-emerald flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#55ff55]" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
