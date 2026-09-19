import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { addTransaction } from '../db/storage';
import { SpendingTransaction, TransactionType } from '../types';
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
  TrendingUp,
  ArrowDownLeft,
} from 'lucide-react';

interface AddSpendingViewProps {
  recentTransactions: SpendingTransaction[];
  onViewHistory: () => void;
}

const SPENT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Health & Care',
  'General',
];

const RECEIVED_CATEGORIES = [
  'Salary & Income',
  'Refund',
  'Cash Back',
  'Gift',
  'Loan Repayment',
  'Freelance',
  'General',
];

export const AddSpendingView: React.FC<AddSpendingViewProps> = ({
  recentTransactions,
  onViewHistory,
}) => {
  const { user } = useAuth();
  const { currency } = useCurrency();

  // Transaction type: 'spent' (default) or 'received' (subtracted during totaling)
  const [type, setType] = useState<TransactionType>('spent');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [category, setCategory] = useState<string>('Food & Dining');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Compute today's totals: received amount is subtracted from spent
  const todayStr = getTodayDateString();
  const todaySpent = recentTransactions
    .filter((t) => t.date === todayStr && t.type !== 'received')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayReceived = recentTransactions
    .filter((t) => t.date === todayStr && t.type === 'received')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayNetTotal = todaySpent - todayReceived;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'received' && category === 'Food & Dining') {
      setCategory('Salary & Income');
    } else if (newType === 'spent' && category === 'Salary & Income') {
      setCategory('Food & Dining');
    }
  };

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
      setErrorMessage(
        type === 'spent'
          ? 'Please provide a reason or note for this spending.'
          : 'Please provide a source or note for this received amount.'
      );
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
        type,
        reason: reason.trim(),
        date,
        category,
      });

      // Clear form inputs
      setAmount('');
      setReason('');
      setSuccessNotice(
        type === 'received'
          ? `Recorded +${formatCurrency(parsedAmount, currency)} received for "${reason.trim()}" (subtracted from total)`
          : `Recorded ${formatCurrency(parsedAmount, currency)} spent for "${reason.trim()}"`
      );

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

  const currentCategories = type === 'received' ? RECEIVED_CATEGORIES : SPENT_CATEGORIES;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10">
      {/* View Header */}
      <div className="text-center mb-6">
        <div className="mc-badge bg-[#1b3d1b] border-2 border-black text-[#55ff55] px-3 py-1 text-xs mb-2">
          {type === 'spent' ? (
            <TrendingDown className="w-3.5 h-3.5 mr-1 text-[#ff5555]" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-[#55ff55]" />
          )}
          <span>Quick Tracker</span>
        </div>
        <h2 className="font-pixel text-2xl sm:text-3xl text-[#ffffff] tracking-wide drop-shadow-[2px_2px_0_#000]">
          {type === 'spent' ? 'Record New Spending' : 'Record Received Amount'}
        </h2>
        <p className="font-mc text-xs sm:text-sm text-[#a0a0a0] mt-1">
          {type === 'spent'
            ? "Log expenses instantly. Added to your total spend."
            : 'Log income, refunds, or cashback. Subtracted from total spend.'}
        </p>
      </div>

      {/* Main Minecraft GUI Box */}
      <div className="mc-panel p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 p-3 mc-panel bg-[#4a1414] border-2 border-[#1a0505] text-[#ff6b6b] text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-[#ff4444] shrink-0 mt-0.5" />
            <span className="font-mc">{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-5 flex items-center gap-2 p-3 mc-panel bg-[#143d1a] border-2 border-[#091f0d] text-[#72ff72] text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#55ff55] shrink-0" />
            <span className="font-mc">{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Transaction Type Toggle: Spent (Default) vs Received */}
          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2">
              Transaction Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-mode-spent"
                type="button"
                onClick={() => handleTypeChange('spent')}
                className={`py-3 px-3 flex items-center justify-center gap-2 cursor-pointer font-pixel text-xs transition ${
                  type === 'spent'
                    ? 'mc-button mc-button-redstone text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <TrendingDown className={`w-4 h-4 ${type === 'spent' ? 'text-[#ffffff]' : 'text-[#ff5555]'}`} />
                <span>Spent (Default)</span>
              </button>

              <button
                id="btn-mode-received"
                type="button"
                onClick={() => handleTypeChange('received')}
                className={`py-3 px-3 flex items-center justify-center gap-2 cursor-pointer font-pixel text-xs transition ${
                  type === 'received'
                    ? 'mc-button mc-button-emerald text-[#ffffff]'
                    : 'mc-button text-[#aaaaaa]'
                }`}
              >
                <TrendingUp className={`w-4 h-4 ${type === 'received' ? 'text-[#ffffff]' : 'text-[#55ff55]'}`} />
                <span>Received (- Subtract)</span>
              </button>
            </div>
            <p className="font-mc text-[11px] text-[#888888] mt-1.5">
              {type === 'spent'
                ? 'Spent amounts add to your total spending.'
                : 'Received amounts are treated as negative values and subtracted when totaling.'}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="spending-amount-input" className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider">
                {type === 'spent' ? 'Amount Spent' : 'Amount Received'} ({currency}) *
              </label>
              {/* Quick amount adders for mobile */}
              <div className="flex items-center gap-1.5">
                {[10, 50, 100, 500].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(amount) || 0;
                      setAmount((cur + inc).toFixed(cur % 1 === 0 ? 0 : 2));
                    }}
                    className="mc-button text-[10px] px-1.5 py-0.5"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffd700] font-pixel text-lg pointer-events-none select-none">
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
                className="mc-input w-full pl-12 pr-4 py-3 text-2xl font-bold text-[#ffffff] placeholder:text-[#555555]"
              />
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="spending-reason-input" className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2">
              {type === 'spent' ? 'Reason / Description *' : 'Source / Description *'}
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#888888] absolute left-3.5 top-3.5" />
              <input
                id="spending-reason-input"
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  type === 'spent'
                    ? 'e.g. Bread, Golden Apples, Iron Ingot, Lunch'
                    : 'e.g. Salary, Freelance project, Cashback, Refund, Gift'
                }
                className="mc-input w-full pl-10 pr-4 py-2.5 text-sm text-[#ffffff] placeholder:text-[#666666]"
              />
            </div>
          </div>

          {/* Date Picker with Quick Date Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="spending-date-input" className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider">
                Date *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className={`mc-button text-[10px] px-2 py-0.5 ${
                    date === getTodayDateString() ? 'mc-button-emerald' : ''
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date(Date.now() - 86400000);
                    setDate(y.toISOString().split('T')[0]);
                  }}
                  className={`mc-button text-[10px] px-2 py-0.5 ${
                    date === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                      ? 'mc-button-emerald'
                      : ''
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#888888] absolute left-3.5 top-3.5" />
              <input
                id="spending-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mc-input w-full pl-10 pr-4 py-2.5 text-sm text-[#ffffff]"
              />
            </div>
          </div>

          {/* Category Quick Tags */}
          <div>
            <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {currentCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`mc-button px-2.5 py-1 text-xs cursor-pointer ${
                    category === cat ? 'mc-button-emerald' : ''
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
            className={`mc-button w-full mt-4 py-3.5 px-6 font-bold text-base cursor-pointer ${
              type === 'received' ? 'mc-button-emerald' : 'mc-button-emerald'
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {type === 'received' ? (
                  <TrendingUp className="w-5 h-5 mr-2 text-[#55ff55]" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2 text-[#55ff55]" />
                )}
                <span>{type === 'received' ? 'Save Received Amount' : 'Save Spending'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Snapshot of Today's Spending & Recent Transactions */}
      <div className="mt-8 mc-panel p-5">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#15120e]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#ffaa00]" />
            <span className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider">
              Today's Net Spend
            </span>
          </div>
          <div className="text-right">
            <span className={`font-pixel text-base ${todayNetTotal < 0 ? 'text-[#55ff55]' : 'text-[#ffd700]'}`}>
              {formatCurrency(todayNetTotal, currency)}
            </span>
            {(todaySpent > 0 && todayReceived > 0) && (
              <div className="font-mc text-[10px] text-[#888888] mt-0.5">
                Spent: {formatCurrency(todaySpent, currency)} | Recv: -{formatCurrency(todayReceived, currency)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 divide-y-2 divide-[#15120e]">
          {recentTransactions.slice(0, 4).map((t) => {
            const isReceived = t.type === 'received';
            return (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#ffffff]">{t.reason}</span>
                    <span
                      className={`font-pixel text-[9px] px-1 py-0.2 border ${
                        isReceived
                          ? 'bg-[#1b3d1b] text-[#55ff55] border-[#2e7d32]'
                          : 'bg-[#3d1b1b] text-[#ff7777] border-[#8b2525]'
                      }`}
                    >
                      {isReceived ? 'Received' : 'Spent'}
                    </span>
                  </div>
                  <span className="text-[#888888] text-[11px] font-mc">
                    {formatDateDisplay(t.date)} • {t.category || 'General'}
                  </span>
                </div>
                <span className={`font-pixel text-sm ${isReceived ? 'text-[#55ff55]' : 'text-[#ff5555]'}`}>
                  {isReceived ? '+' : '-'}{formatCurrency(t.amount, currency)}
                </span>
              </div>
            );
          })}

          {recentTransactions.length === 0 && (
            <div className="py-4 text-center text-xs text-[#888888] font-mc">
              No items in chest yet. Add your first above!
            </div>
          )}
        </div>

        {recentTransactions.length > 0 && (
          <button
            id="btn-view-all-history"
            onClick={onViewHistory}
            className="mc-button w-full mt-3 py-2 text-center text-xs font-bold text-[#55ffff] flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>View All Spending History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
