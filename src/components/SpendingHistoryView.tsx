import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { SpendingTransaction, TimeGrouping } from '../types';
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
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
        if (sortOrder === 'oldest') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        if (sortOrder === 'highest') return b.amount - a.amount;
        if (sortOrder === 'lowest') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, searchQuery, categoryFilter, sortOrder]);

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

  // Total summary metrics
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const averageAmount = filteredTransactions.length > 0 ? totalAmount / filteredTransactions.length : 0;

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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Spending History
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Browse, group, edit, or export your recorded expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-excel-history"
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            title="Download formatted Excel workbook"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Spent</span>
            <CreditCard className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-[#0c3744]">
            {formatCurrency(totalAmount, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {filteredTransactions.length} record{filteredTransactions.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Transactions</span>
            <CalendarDays className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            {filteredTransactions.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Filtered in current view
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Average Spend</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            {formatCurrency(averageAmount, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Per transaction
          </div>
        </div>
      </div>

      {/* Control Bar: Grouping Tabs, Search, Filters & Sorting */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs mb-6 space-y-3">
        {/* Requirement: Group by Day, Month, and Year */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">
              Group by:
            </span>
            {(['all', 'day', 'month', 'year'] as TimeGrouping[]).map((g) => (
              <button
                key={g}
                id={`btn-group-${g}`}
                onClick={() => setGrouping(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  grouping === g
                    ? 'bg-[#0c3744] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
              className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
            >
              <option value="newest">Date: Newest First</option>
              <option value="oldest">Date: Oldest First</option>
              <option value="highest">Amount: High to Low</option>
              <option value="lowest">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Search & Category filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reason or date (YYYY-MM)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
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
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-3 w-20 bg-slate-100 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTransactions.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">No Transactions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            {searchQuery || categoryFilter !== 'all'
              ? 'No spending records match your search filters. Try clearing your search.'
              : 'You haven’t recorded any spending yet. Start logging your daily expenses now!'}
          </p>
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0c3744] hover:bg-[#124b5d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Record New Spending
          </button>
        </div>
      )}

      {/* Grouped Transactions List */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="space-y-6">
          {groupedData.map(({ groupTitle, items }) => {
            const groupSubtotal = items.reduce((sum, item) => sum + item.amount, 0);

            return (
              <div key={groupTitle} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                {/* Group Header */}
                <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      {groupTitle}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({items.length})
                    </span>
                  </div>
                  <span className="font-black text-xs text-[#0c3744]">
                    Subtotal: {formatCurrency(groupSubtotal, currency)}
                  </span>
                </div>

                {/* Group Items */}
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition group"
                    >
                      <div className="flex flex-col pr-3">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.reason}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{formatDateDisplay(item.date)}</span>
                          <span>•</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium">
                            {item.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-slate-900">
                          {formatCurrency(item.amount, currency)}
                        </span>
                        <button
                          onClick={() => setEditingTransaction(item)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition opacity-80 group-hover:opacity-100 cursor-pointer"
                          title="Edit or Delete transaction"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
