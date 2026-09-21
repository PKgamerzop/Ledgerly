import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { addTransaction } from '../db/storage';
import { SpendingTransaction, TransactionType } from '../types';
import { getTodayDateString, formatCurrency, formatDateDisplay } from '../utils/formatters';
import {
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  BookOpen,
  PenTool,
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

  // Transaction type: 'spent' (default) or 'received'
  const [type, setType] = useState<TransactionType>('spent');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [category, setCategory] = useState<string>('Food & Dining');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Compute today's totals
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
          ? 'Please enter an account note or description for this debit.'
          : 'Please enter a source or description for this credit.'
      );
      return;
    }

    // Validation 3: Date check
    const selectedDate = new Date(date);
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 30);
    if (selectedDate > maxFuture) {
      setErrorMessage('The entry date cannot be more than 30 days in the future.');
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
          ? `Entered to Ledger: +${formatCurrency(parsedAmount, currency)} credit recorded in green ink.`
          : `Entered to Ledger: -${formatCurrency(parsedAmount, currency)} debit recorded in red ink.`
      );

      setTimeout(() => {
        setSuccessNotice(null);
      }, 4000);
    } catch (err: unknown) {
      console.error('Error adding transaction:', err);
      setErrorMessage('Could not record entry. Please verify your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCategories = type === 'received' ? RECEIVED_CATEGORIES : SPENT_CATEGORIES;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10">
      {/* View Header (The Vintage Bookkeeper Style) */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-[#f4ede1] border border-[#d8c7b0] text-[#6b4028] px-3.5 py-1 rounded-full text-xs font-serif mb-2.5 shadow-xs">
          <BookOpen className="w-3.5 h-3.5 text-[#85261c]" />
          <span className="font-semibold tracking-wide">Journal Voucher &bull; Daybook Register</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#24140a] tracking-tight">
          {type === 'spent' ? 'Record Debit Entry' : 'Record Credit Entry'}
        </h2>
        <p className="text-xs text-[#6e5340] mt-1 font-serif italic">
          {type === 'spent'
            ? 'Classic red ink deduction entered into your accounting ledger.'
            : 'Archival green ink credit entered into your cash receipts account.'}
        </p>
      </div>

      {/* Main Parchment Docket Card */}
      <div className="vintage-card p-5 sm:p-7 relative overflow-hidden">
        {/* Vintage leather trim border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#85261c] via-[#c59b27] to-[#265c3b]"></div>

        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-[#fbf0ee] border border-[#e8b6b0] text-[#a63428] text-xs rounded-xl font-medium leading-relaxed">
            <AlertCircle className="w-4 h-4 text-[#a63428] shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-5 flex items-center gap-2 p-3.5 bg-[#eff7f1] border border-[#b9deb4] text-[#265c3b] text-xs font-serif font-semibold rounded-xl shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#265c3b] shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Transaction Type Toggle: Spent (Debit - Red Ink) vs Received (Credit - Green Ink) */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-2">
              Folio Column / Transaction Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="btn-mode-spent"
                type="button"
                onClick={() => handleTypeChange('spent')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-serif text-xs transition border ${
                  type === 'spent'
                    ? 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0] font-bold shadow-xs'
                    : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0] hover:border-[#bfaaa0]'
                }`}
              >
                <TrendingDown className={`w-4 h-4 ${type === 'spent' ? 'text-[#a63428]' : 'text-[#8c7361]'}`} />
                <span>Debit (Red Ink Expense)</span>
              </button>

              <button
                id="btn-mode-received"
                type="button"
                onClick={() => handleTypeChange('received')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-serif text-xs transition border ${
                  type === 'received'
                    ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4] font-bold shadow-xs'
                    : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0] hover:border-[#bfaaa0]'
                }`}
              >
                <TrendingUp className={`w-4 h-4 ${type === 'received' ? 'text-[#265c3b]' : 'text-[#8c7361]'}`} />
                <span>Credit (Green Ink Receipt)</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="spending-amount-input" className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider">
                {type === 'spent' ? 'Debit Amount' : 'Credit Amount'} ({currency}) *
              </label>
              {/* Quick amount adders (Parchment buttons) */}
              <div className="flex items-center gap-1.5 font-serif">
                {[10, 50, 100, 500].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(amount) || 0;
                      setAmount((cur + inc).toFixed(cur % 1 === 0 ? 0 : 2));
                    }}
                    className="bg-[#f4ede1] hover:bg-[#ede3d1] text-[#4a2c1d] border border-[#d8c7b0] rounded-lg text-xs font-semibold px-2 py-0.5 transition cursor-pointer shadow-2xs"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 font-serif text-[#8c7361] font-bold text-2xl pointer-events-none select-none">
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
                className={`w-full pl-12 pr-4 py-3 font-serif text-3xl sm:text-4xl font-bold bg-[#ffffff] border rounded-xl outline-none transition placeholder:text-[#c7b7a3] shadow-inner tabular-nums ${
                  type === 'spent'
                    ? 'text-[#a63428] border-[#d8c7b0] focus:border-[#a63428] focus:ring-2 focus:ring-[#a63428]/15'
                    : 'text-[#265c3b] border-[#d8c7b0] focus:border-[#265c3b] focus:ring-2 focus:ring-[#265c3b]/15'
                }`}
              />
            </div>
          </div>

          {/* Reason / Account Note */}
          <div>
            <label htmlFor="spending-reason-input" className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-2">
              {type === 'spent' ? 'Description / Account Debit *' : 'Source / Remitter Note *'}
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-3.5" />
              <input
                id="spending-reason-input"
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  type === 'spent'
                    ? 'e.g. Printing supplies, Luncheon, Railway ticket, Office utilities'
                    : 'e.g. Monthly stipend, Client retainer, Dividend, Settle cash'
                }
                className="w-full pl-10 pr-4 py-2.5 text-sm text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] focus:ring-2 focus:ring-[#6b4028]/15 outline-none transition placeholder:text-[#a89584] shadow-xs"
              />
            </div>
          </div>

          {/* Date Picker with Quick Date Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="spending-date-input" className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider">
                Journal Entry Date *
              </label>
              <div className="flex items-center gap-1.5 font-serif">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold transition cursor-pointer border ${
                    date === getTodayDateString()
                      ? 'bg-[#2c1810] text-[#fbf5eb] border-[#2c1810]'
                      : 'bg-[#f4ede1] text-[#6b4028] border-[#d8c7b0] hover:bg-[#ede3d1]'
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
                  className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold transition cursor-pointer border ${
                    date === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                      ? 'bg-[#2c1810] text-[#fbf5eb] border-[#2c1810]'
                      : 'bg-[#f4ede1] text-[#6b4028] border-[#d8c7b0] hover:bg-[#ede3d1]'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-3.5" />
              <input
                id="spending-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm text-[#24140a] bg-[#ffffff] border border-[#cfbeaa] rounded-xl focus:border-[#6b4028] focus:ring-2 focus:ring-[#6b4028]/15 outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* Category Quick Tags */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#594132] uppercase tracking-wider mb-2">
              Accounting Ledger Category
            </label>
            <div className="flex flex-wrap gap-2">
              {currentCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-serif text-xs transition cursor-pointer border ${
                    category === cat
                      ? 'bg-[#2c1810] text-[#fbf5eb] border-[#2c1810] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#594132] border-[#d8c7b0] hover:border-[#bfaaa0] hover:bg-[#faf4ea]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Vintage Action Button */}
          <button
            id="btn-save-spending"
            type="submit"
            disabled={submitting}
            className={`w-full mt-4 py-3.5 px-6 font-serif font-bold text-sm tracking-wide rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              type === 'received' ? 'btn-green-ink' : 'btn-red-ink'
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <PenTool className="w-4 h-4 text-white" />
                <span>
                  {type === 'received'
                    ? 'Ink Credit Entry to Ledger'
                    : 'Ink Debit Entry to Ledger'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Snapshot of Today's Daybook & Recent Transactions */}
      <div className="mt-8 vintage-card p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#dfd1bd]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#85261c]" />
            <span className="font-serif text-xs font-bold text-[#4a2c1d] uppercase tracking-wider">
              Today&apos;s Daybook Balance
            </span>
          </div>
          <div className="text-right">
            <span className={`font-serif text-xl sm:text-2xl font-bold tabular-nums ${todayNetTotal < 0 ? 'text-[#265c3b]' : 'text-[#a63428]'}`}>
              {formatCurrency(todayNetTotal, currency)}
            </span>
            {(todaySpent > 0 && todayReceived > 0) && (
              <div className="font-serif text-[11px] text-[#7d6350] mt-0.5">
                Debits: {formatCurrency(todaySpent, currency)} | Credits: -{formatCurrency(todayReceived, currency)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 divide-y divide-[#ebdcc8]">
          {recentTransactions.slice(0, 4).map((t) => {
            const isReceived = t.type === 'received';
            return (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-semibold text-[#24140a]">{t.reason}</span>
                    <span
                      className={`text-[10px] font-serif px-1.5 py-0.2 rounded font-bold border ${
                        isReceived
                          ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4]'
                          : 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0]'
                      }`}
                    >
                      {isReceived ? 'Credit' : 'Debit'}
                    </span>
                  </div>
                  <span className="text-[#8c7361] text-[11px] mt-0.5 font-serif italic">
                    {formatDateDisplay(t.date)} &bull; {t.category || 'General'}
                  </span>
                </div>
                <span className={`font-serif text-sm font-bold tabular-nums ${isReceived ? 'text-[#265c3b]' : 'text-[#a63428]'}`}>
                  {isReceived ? '+' : '-'}{formatCurrency(t.amount, currency)}
                </span>
              </div>
            );
          })}

          {recentTransactions.length === 0 && (
            <div className="py-6 text-center text-xs text-[#8c7361] font-serif italic">
              No journal entries recorded for today yet.
            </div>
          )}
        </div>

        {recentTransactions.length > 0 && (
          <button
            id="btn-view-all-history"
            onClick={onViewHistory}
            className="w-full mt-3 py-2.5 text-center font-serif text-xs font-bold text-[#6b4028] hover:text-[#2c1810] bg-[#f4ede1] hover:bg-[#ede2ce] border border-[#d8c7b0] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <span>Inspect Complete General Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6b4028]" />
          </button>
        )}
      </div>
    </div>
  );
};
