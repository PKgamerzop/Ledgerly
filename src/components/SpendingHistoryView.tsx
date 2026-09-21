import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { SpendingTransaction, TimeGrouping } from '../types';
import { formatCurrency, formatDateDisplay, exportTransactionsToExcel } from '../utils/formatters';
import { EditTransactionModal } from './EditTransactionModal';
import {
  Calendar,
  Search,
  Download,
  Edit3,
  Inbox,
  TrendingUp,
  TrendingDown,
  Plus,
  BookOpen,
  FileText,
  DollarSign,
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
      return [{ groupTitle: 'Complete General Register', items: filteredTransactions }];
    }

    const groups: { [key: string]: SpendingTransaction[] } = {};

    filteredTransactions.forEach((t) => {
      const [year, month] = t.date.split('-');
      let key = '';

      if (grouping === 'day') {
        key = formatDateDisplay(t.date);
      } else if (grouping === 'month') {
        const d = new Date(Number(year), Number(month) - 1, 1);
        key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (grouping === 'year') {
        key = `Year of ${year}`;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return Object.entries(groups).map(([groupTitle, items]) => ({
      groupTitle,
      items,
    }));
  }, [filteredTransactions, grouping]);

  // Total metrics
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
      {/* Top Banner & Title (The Vintage Bookkeeper Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#f4ede1] border border-[#d8c7b0] text-[#6b4028] px-3.5 py-1 rounded-full text-xs font-serif mb-2 shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-[#85261c]" />
            <span className="font-semibold tracking-wide">General Ledger &bull; Folio Archive</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#24140a] tracking-tight">
            General Ledger &amp; Cash Book
          </h2>
          <p className="text-xs text-[#6e5340] mt-1 font-serif italic">
            Chronological accounting ledger with classic red ink deductions and green ink receipts.
          </p>
        </div>

        {/* Action Buttons: Add New & Export Excel */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-history-export-excel"
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            className="font-serif px-3.5 py-2 rounded-xl text-xs font-bold bg-[#eff7f1] border border-[#b9deb4] text-[#265c3b] hover:bg-[#e4f2e8] transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download formatted Excel ledger statement"
          >
            <Download className="w-3.5 h-3.5 text-[#265c3b]" />
            <span>Export Statement (.xlsx)</span>
          </button>

          <button
            id="btn-history-add-new"
            onClick={onAddNew}
            className="btn-leather font-serif px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#fbf5eb]" />
            <span>+ Record Entry</span>
          </button>
        </div>
      </div>

      {/* Bookkeeper Metric Summary Grid (Parchment & Accounting Ink) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        {/* Net Spend Metric */}
        <div className="vintage-card p-4">
          <div className="flex items-center justify-between text-xs text-[#6e5340] mb-1 font-serif font-bold uppercase tracking-wider">
            <span>Net Expenditure</span>
            <span className="text-[10px] text-[#8c7361] bg-[#f4ede1] px-1.5 py-0.2 rounded border border-[#dfd1bd]">
              Filtered
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#24140a]">
            {formatCurrency(netTotalAmount, currency)}
          </div>
          <div className="text-[11px] text-[#7d6350] mt-1 font-serif italic">
            Debits less credits ({filteredTransactions.length} entries)
          </div>
        </div>

        {/* Total Spent Metric (Red Ink) */}
        <div className="vintage-card p-4 border-l-4 border-l-[#a63428]">
          <div className="flex items-center justify-between text-xs text-[#a63428] mb-1 font-serif font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Total Debits (Red Ink)</span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#a63428]">
            {formatCurrency(totalSpent, currency)}
          </div>
          <div className="text-[11px] text-[#8c7361] mt-1 font-serif italic">
            Total expenses &amp; disbursements
          </div>
        </div>

        {/* Total Received Metric (Green Ink) */}
        <div className="vintage-card p-4 border-l-4 border-l-[#265c3b]">
          <div className="flex items-center justify-between text-xs text-[#265c3b] mb-1 font-serif font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Total Credits (Green Ink)</span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#265c3b]">
            {formatCurrency(totalReceived, currency)}
          </div>
          <div className="text-[11px] text-[#8c7361] mt-1 font-serif italic">
            Income &amp; incoming receipts
          </div>
        </div>
      </div>

      {/* Parchment Filter Controls */}
      <div className="vintage-card p-4 mb-6 space-y-3.5">
        {/* Search Bar & Type Segment */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-3" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ledger entries, notes, or dates..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#ffffff] border border-[#cfbeaa] rounded-xl text-[#24140a] placeholder:text-[#a89584] focus:border-[#6b4028] focus:ring-1 focus:ring-[#6b4028]/20 outline-none transition shadow-2xs"
            />
          </div>

          {/* Type Filter Pills: All / Debits / Credits */}
          <div className="sm:col-span-5 flex items-center bg-[#f4ede1] p-1 rounded-xl border border-[#dfd1bd]">
            <button
              id="filter-type-all"
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif ${
                typeFilter === 'all'
                  ? 'bg-[#ffffff] text-[#2c1810] font-bold shadow-xs border border-[#cfbeaa]'
                  : 'text-[#6e5340] hover:text-[#24140a]'
              }`}
            >
              All Folios
            </button>
            <button
              id="filter-type-spent"
              type="button"
              onClick={() => setTypeFilter('spent')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif ${
                typeFilter === 'spent'
                  ? 'bg-[#fbf0ee] text-[#a63428] font-bold shadow-xs border border-[#e8b6b0]'
                  : 'text-[#6e5340] hover:text-[#a63428]'
              }`}
            >
              Debits (Red)
            </button>
            <button
              id="filter-type-received"
              type="button"
              onClick={() => setTypeFilter('received')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition cursor-pointer font-serif ${
                typeFilter === 'received'
                  ? 'bg-[#eff7f1] text-[#265c3b] font-bold shadow-xs border border-[#b9deb4]'
                  : 'text-[#6e5340] hover:text-[#265c3b]'
              }`}
            >
              Credits (Green)
            </button>
          </div>
        </div>

        {/* Secondary Filters: Grouping, Category, and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#dfd1bd] text-xs">
          {/* Time Grouping */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#7d6350] font-serif font-semibold text-[11px]">View by:</span>
            {(['all', 'day', 'month', 'year'] as TimeGrouping[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrouping(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-serif transition cursor-pointer border ${
                  grouping === g
                    ? 'bg-[#2c1810] text-[#fbf5eb] border-[#2c1810] font-bold shadow-2xs'
                    : 'bg-[#ffffff] text-[#6e5340] border-[#d8c7b0] hover:bg-[#faf4ea]'
                }`}
              >
                {g === 'all' ? 'All' : g === 'day' ? 'Daybook' : g === 'month' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>

          {/* Category & Sort Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              id="history-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1 px-2.5 bg-[#ffffff] border border-[#cfbeaa] text-[#2c1810] rounded-xl text-xs font-serif focus:outline-none focus:border-[#6b4028] cursor-pointer shadow-2xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              id="history-sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="py-1 px-2.5 bg-[#ffffff] border border-[#cfbeaa] text-[#2c1810] rounded-xl text-xs font-serif focus:outline-none focus:border-[#6b4028] cursor-pointer shadow-2xs"
            >
              <option value="newest">Sort: Newest Date</option>
              <option value="oldest">Sort: Oldest Date</option>
              <option value="highest">Sort: Highest Amount</option>
              <option value="lowest">Sort: Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List / Ledger Table */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#7d6350] font-serif">
          <div className="w-8 h-8 border-2 border-[#6b4028]/30 border-t-[#6b4028] rounded-full animate-spin mx-auto mb-3" />
          <span className="italic">Reviewing accounting ledger archives...</span>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="vintage-card p-12 text-center">
          <Inbox className="w-10 h-10 text-[#a89584] mx-auto mb-3" />
          <h3 className="font-serif text-base font-bold text-[#24140a]">
            No Matching Journal Records Found
          </h3>
          <p className="text-xs text-[#6e5340] mt-1 max-w-sm mx-auto font-serif italic">
            Try adjusting your search query, filter criteria, or date periods.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group) => (
            <div
              key={group.groupTitle}
              className="vintage-card overflow-hidden"
            >
              {/* Folio Group Header */}
              <div className="bg-[#f4ede1] px-5 py-3 border-b border-[#dfd1bd] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#85261c]" />
                  <span className="font-serif font-bold text-[#2c1810] tracking-wide text-sm">
                    {group.groupTitle}
                  </span>
                  <span className="text-[11px] text-[#7d6350] font-serif italic">
                    ({group.items.length} {group.items.length === 1 ? 'entry' : 'entries'})
                  </span>
                </div>
                <div className="text-right font-serif">
                  <span className="text-[#7d6350] text-[11px] mr-1.5 uppercase tracking-wider font-semibold">Subtotal:</span>
                  <span className="font-bold tabular-nums text-[#2c1810] text-sm accounting-double-rule">
                    {formatCurrency(
                      group.items.reduce(
                        (acc, t) => acc + (t.type === 'received' ? -t.amount : t.amount),
                        0
                      ),
                      currency
                    )}
                  </span>
                </div>
              </div>

              {/* Group Item Rows (Ruled Accounting Paper) */}
              <div className="divide-y divide-[#ebdcc8]">
                {group.items.map((t) => {
                  const isReceived = t.type === 'received';
                  return (
                    <div
                      key={t.id}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-[#faf4ea] transition group"
                    >
                      {/* Left: Date, Type pill, Reason, Category */}
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-serif font-bold px-2 py-0.5 rounded border ${
                                isReceived
                                  ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4]'
                                  : 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0]'
                              }`}
                            >
                              {isReceived ? 'Credit' : 'Debit'}
                            </span>
                            <span className="font-serif font-bold text-[#24140a] text-sm truncate">
                              {t.reason}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#7d6350] mt-0.5 font-serif italic">
                            <span>{t.date}</span>
                            <span>&bull;</span>
                            <span>{t.category || 'General'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Tabular Decimal Aligned Amount + Edit button */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-serif">
                          <div
                            className={`text-base sm:text-lg font-bold tabular-nums tracking-tight ${
                              isReceived ? 'text-[#265c3b]' : 'text-[#a63428]'
                            }`}
                          >
                            {isReceived ? '+' : '-'}
                            {formatCurrency(t.amount, currency)}
                          </div>
                        </div>

                        <button
                          id={`btn-edit-tx-${t.id}`}
                          onClick={() => setEditingTransaction(t)}
                          className="p-1.5 rounded-lg bg-[#ffffff] border border-[#cfbeaa] text-[#7d6350] hover:text-[#2c1810] hover:border-[#6b4028] transition cursor-pointer shadow-2xs"
                          title="Amend or void journal entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
