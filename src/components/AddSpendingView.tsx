import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { addTransaction } from '../db/storage';
import { SpendingTransaction } from '../types';
import { getTodayDateString, formatCurrency, formatDateDisplay } from '../utils/formatters';
import {
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

interface AddSpendingViewProps {
  recentTransactions: SpendingTransaction[];
  onViewHistory: () => void;
}

const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Health & Care',
  'General',
];

export const AddSpendingView: React.FC<AddSpendingViewProps> = ({
  recentTransactions,
  onViewHistory,
}) => {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [category, setCategory] = useState<string>('Food & Dining');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Compute today's total from recent transactions
  const todayStr = getTodayDateString();
  const todayTotal = recentTransactions
    .filter((t) => t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!user) return;

    // Validation 1: Amount must be strictly positive numeric
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Amount must be a strictly positive number greater than 0.');
      return;
    }

    // Validation 2: Reason must not be empty
    if (!reason.trim()) {
      setErrorMessage('Please provide a reason or note for this spending.');
      return;
    }

    // Validation 3: Illogical future date check (> 30 days in future)
    const selectedDate = new Date(date);
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 30);
    if (selectedDate > maxFuture) {
      setErrorMessage('The transaction date cannot be more than 30 days in the future.');
      return;
    }

    try {
      setSubmitting(true);
      await addTransaction(user.uid, {
        amount: parsedAmount,
        reason: reason.trim(),
        date,
        category,
      });

      // Clear form inputs
      setAmount('');
      setReason('');
      setSuccessNotice(`Recorded ${formatCurrency(parsedAmount, currency)} for "${reason.trim()}"`);

      // Reset success notice after 4 seconds
      setTimeout(() => {
        setSuccessNotice(null);
      }, 4000);
    } catch (err: unknown) {
      console.error('Error adding transaction:', err);
      setErrorMessage('Failed to save transaction. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10">
      {/* View Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-teal-600" />
          Quick Spending Tracker
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Record New Spending
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Add today's expenses instantly. Saved offline if you're disconnected.
        </p>
      </div>

      {/* Main Centered Add Transaction Form */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200/90 p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-5 flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Input */}
          <div>
            <label htmlFor="spending-amount-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Amount Spent ({currency}) *
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none select-none">
                {currency}
              </div>
              <input
                id="spending-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-2xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="spending-reason-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reason / Description *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="spending-reason-input"
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Lunch with team, Groceries, Uber"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Date Picker Input */}
          <div>
            <label htmlFor="spending-date-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="spending-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Category Quick Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    category === cat
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Prominent Save / Add Button */}
          <button
            id="btn-save-spending"
            type="submit"
            disabled={submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[#0c3744] hover:bg-[#124d5e] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-bold text-base shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-teal-300" />
                <span>Save Spending</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Snapshot of Today's Spending & Recent Transactions */}
      <div className="mt-8 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/70 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Today's Spend
            </span>
          </div>
          <span className="text-sm font-extrabold text-[#0c3744]">
            {formatCurrency(todayTotal, currency)}
          </span>
        </div>

        <div className="mt-3 divide-y divide-slate-100">
          {recentTransactions.slice(0, 3).map((t) => (
            <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800">{t.reason}</span>
                <span className="text-slate-400 text-[11px]">{formatDateDisplay(t.date)} • {t.category || 'General'}</span>
              </div>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(t.amount, currency)}
              </span>
            </div>
          ))}

          {recentTransactions.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400">
              No transactions recorded yet. Add your first above!
            </div>
          )}
        </div>

        {recentTransactions.length > 0 && (
          <button
            id="btn-view-all-history"
            onClick={onViewHistory}
            className="w-full mt-3 pt-2 text-center text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>View All Spending History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
