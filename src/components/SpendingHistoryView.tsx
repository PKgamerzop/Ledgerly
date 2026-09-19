import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { SpendingTransaction, TimeGrouping, TransactionType } from '../types';
import { formatCurrency, formatDateDisplay, exportTransactionsToExcel } from '../utils/formatters';
import { EditTransactionModal } from './EditTransactionModal';
import {
  Calendar,
  Filter,
  Search,
  Download,
  Edit3,
  CalendarDays,
  CreditCard,
  Inbox,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
} from 'lucide-react';

interface SpendingHistoryViewProps {
  transactions: SpendingTransaction[];
  loading: boolean;
  onAddNew: () => void;
}

export const SpendingHistoryView: React.FC<SpendingHistoryViewProps> = ({
  transactions,
  loading,
  onAddNew,
}) => {
  const { currency } = useCurrency();

  const [grouping, setGrouping] = useState<TimeGrouping>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'spent' | 'received'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [editingTransaction, setEditingTransaction] = useState<SpendingTransaction | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch =
          t.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.date.includes(searchQuery);
        const matchesCategory =
          categoryFilter === 'all' || t.category === categoryFilter;
        const matchesType =
          typeFilter === 'all' ||
          (typeFilter === 'received' ? t.type === 'received' : t.type !== 'received');

        return matchesSearch && matchesCategory && matchesType;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
        if (sortOrder === 'oldest') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        if (sortOrder === 'highest') return b.amount - a.amount;
        if (sortOrder === 'lowest') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, searchQuery, categoryFilter, typeFilter, sortOrder]);

  // Grouped transactions
  const groupedData = useMemo(() => {
    if (grouping === 'all') {
      return [{ groupTitle: 'All Transactions', items: filteredTransactions }];
    }

    const groups: { [key: string]: SpendingTransaction[] } = {};

    filteredTransactions.forEach((t) => {
      const [year, month, day] = t.date.split('-');
      let key = '';

      if (grouping === 'day') {
        key = formatDateDisplay(t.date);
      } else if (grouping === 'month') {
        const d = new Date(Number(year), Number(month) - 1, 1);
        key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (grouping === 'year') {
        key = year;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return Object.entries(groups).map(([groupTitle, items]) => ({
      groupTitle,
      items,
    }));
  }, [filteredTransactions, grouping]);

  // Total metrics: received amounts are subtracted from spent amounts
  const netTotalAmount = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, t) => sum + (t.type === 'received' ? -t.amount : t.amount),
      0
    );
  }, [filteredTransactions]);

  const totalSpent = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type !== 'received')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalReceived = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'received')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;
    const periodName = grouping === 'all' ? 'All_Time' : grouping.toUpperCase();
    exportTransactionsToExcel(filteredTransactions, periodName, currency);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-pixel text-2xl sm:text-3xl text-[#ffffff] tracking-wide drop-shadow-[2px_2px_0_#000]">
            Spending History
          </h2>
          <p className="font-mc text-xs sm:text-sm text-[#a0a0a0] mt-1">
            Browse, filter, edit, or export recorded expenses and received income.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-excel-history"
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            className="mc-button mc-button-emerald flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer disabled:opacity-40"
            title="Download formatted Excel workbook"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (Net Total Spend, Total Spent, Total Received) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        {/* Card 1: Net Total Spend (Spent minus Received) */}
        <div className="mc-panel p-4">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-1">
            <span className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider">
              Net Total Spend
            </span>
            <CreditCard className="w-4 h-4 text-[#ffd700]" />
          </div>
          <div
            className={`font-pixel text-xl sm:text-2xl ${
              netTotalAmount < 0 ? 'text-[#55ff55]' : 'text-[#ff5555]'
            }`}
          >
            {formatCurrency(netTotalAmount, currency)}
          </div>
          <div className="font-mc text-[10px] text-[#888888] mt-1">
            Spent: {formatCurrency(totalSpent, currency)} | Recv: -{formatCurrency(totalReceived, currency)}
          </div>
        </div>

        {/* Card 2: Total Spent (Expenses) */}
        <div className="mc-panel p-4">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-1">
            <span className="font-pixel text-xs text-[#ff7777] uppercase tracking-wider">
              Total Spent
            </span>
            <TrendingDown className="w-4 h-4 text-[#ff5555]" />
          </div>
          <div className="font-pixel text-xl sm:text-2xl text-[#ff5555]">
            {formatCurrency(totalSpent, currency)}
          </div>
          <div className="font-mc text-[10px] text-[#888888] mt-1">
            {filteredTransactions.filter((t) => t.type !== 'received').length} expense item(s)
          </div>
        </div>

        {/* Card 3: Total Received (Subtracted) */}
        <div className="mc-panel p-4">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-1">
            <span className="font-pixel text-xs text-[#55ff55] uppercase tracking-wider">
              Total Received
            </span>
            <TrendingUp className="w-4 h-4 text-[#55ff55]" />
          </div>
          <div className="font-pixel text-xl sm:text-2xl text-[#55ff55]">
            +{formatCurrency(totalReceived, currency)}
          </div>
          <div className="font-mc text-[10px] text-[#55ff55]/80 mt-1">
            Subtracted from total spend
          </div>
        </div>
      </div>

      {/* Control Bar: Grouping Tabs, Search, Filters & Sorting */}
      <div className="mc-panel p-4 mb-6 space-y-3">
        {/* Group by Day, Month, and Year */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider mr-1">
              Group by:
            </span>
            {(['all', 'day', 'month', 'year'] as TimeGrouping[]).map((g) => (
              <button
                key={g}
                id={`btn-group-${g}`}
                onClick={() => setGrouping(g)}
                className={`mc-button text-[11px] px-2.5 py-1 uppercase font-bold cursor-pointer ${
                  grouping === g ? 'mc-button-emerald' : ''
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#888888]" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
              className="mc-input text-xs font-bold py-1.5 px-2.5 text-[#ffffff] cursor-pointer"
            >
              <option value="newest" className="bg-[#25201b]">Date: Newest First</option>
              <option value="oldest" className="bg-[#25201b]">Date: Oldest First</option>
              <option value="highest" className="bg-[#25201b]">Amount: High to Low</option>
              <option value="lowest" className="bg-[#25201b]">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Search, Type Filter & Category filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t-2 border-[#15120e]">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reason, note, or date (YYYY-MM)..."
              className="mc-input w-full pl-9 pr-3 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
            />
          </div>

          {/* Type filter (All, Spent, Received) */}
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'spent' | 'received')}
              className="mc-input w-full sm:w-auto text-xs font-bold px-2.5 py-2 text-[#ffffff] cursor-pointer"
            >
              <option value="all" className="bg-[#25201b]">All Types</option>
              <option value="spent" className="bg-[#25201b]">Spent Only</option>
              <option value="received" className="bg-[#25201b]">Received Only</option>
            </select>
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-[#888888]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="mc-input w-full sm:w-auto text-xs font-bold px-3 py-2 text-[#ffffff] cursor-pointer"
              >
                <option value="all" className="bg-[#25201b]">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#25201b]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mc-panel p-4 animate-pulse flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-[#332b24]"></div>
                <div className="h-3 w-20 bg-[#28211a]"></div>
              </div>
              <div className="h-6 w-16 bg-[#332b24]"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTransactions.length === 0 && (
        <div className="mc-panel p-10 text-center">
          <div className="w-16 h-16 bg-[#161310] border-2 border-black text-[#ffaa00] flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="font-pixel text-lg text-[#ffffff]">No Transactions Found</h3>
          <p className="font-mc text-xs text-[#888888] max-w-sm mx-auto mt-1 mb-6">
            {searchQuery || categoryFilter !== 'all' || typeFilter !== 'all'
              ? 'No spending or received records match your search filters. Try clearing filters.'
              : 'You haven’t recorded any transactions yet. Start logging your expenses or received amounts!'}
          </p>
          <button
            onClick={onAddNew}
            className="mc-button mc-button-emerald inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold cursor-pointer"
          >
            Record New Item
          </button>
        </div>
      )}

      {/* Grouped Transactions List */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="space-y-6">
          {groupedData.map(({ groupTitle, items }) => {
            // Group subtotal: received amounts subtract
            const groupSubtotal = items.reduce(
              (sum, item) => sum + (item.type === 'received' ? -item.amount : item.amount),
              0
            );

            return (
              <div key={groupTitle} className="mc-panel overflow-hidden">
                {/* Group Header */}
                <div className="bg-[#1e1914] px-4 py-3 border-b-2 border-[#120e0a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#55ff55]" />
                    <span className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider">
                      {groupTitle}
                    </span>
                    <span className="font-mc text-[11px] text-[#888888]">
                      ({items.length})
                    </span>
                  </div>
                  <span
                    className={`font-pixel text-xs ${
                      groupSubtotal < 0 ? 'text-[#55ff55]' : 'text-[#ff5555]'
                    }`}
                  >
                    Net Subtotal: {formatCurrency(groupSubtotal, currency)}
                  </span>
                </div>

                {/* Group Items */}
                <div className="divide-y-2 divide-[#16120e]">
                  {items.map((item) => {
                    const isReceived = item.type === 'received';
                    return (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between hover:bg-[#2e2721] transition group"
                      >
                        <div className="flex flex-col pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#ffffff] text-sm">
                              {item.reason}
                            </span>
                            <span
                              className={`font-pixel text-[9px] px-1.5 py-0.5 border ${
                                isReceived
                                  ? 'bg-[#1b3d1b] text-[#55ff55] border-[#2e7d32]'
                                  : 'bg-[#3d1b1b] text-[#ff7777] border-[#8b2525]'
                              }`}
                            >
                              {isReceived ? 'Received' : 'Spent'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#888888] mt-1 font-mc">
                            <span>{formatDateDisplay(item.date)}</span>
                            <span>•</span>
                            <span className="mc-badge bg-[#1c1813] text-[#a0a0a0] px-2 py-0.5 text-[10px]">
                              {item.category || 'General'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`font-pixel text-base ${
                              isReceived ? 'text-[#55ff55]' : 'text-[#ff5555]'
                            }`}
                          >
                            {isReceived ? '+' : '-'}{formatCurrency(item.amount, currency)}
                          </span>
                          <button
                            onClick={() => setEditingTransaction(item)}
                            className="mc-button p-2 cursor-pointer text-[#ffd700]"
                            title="Edit or Delete transaction"
                            aria-label="Edit or delete transaction"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};
