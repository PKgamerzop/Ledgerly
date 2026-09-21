import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { SpendingTransaction } from '../types';
import { exportTransactionsToExcel, formatCurrency } from '../utils/formatters';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Mail,
  Code2,
  BookOpen,
} from 'lucide-react';

interface MonthlyReportModalProps {
  transactions: SpendingTransaction[];
  onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  transactions,
  onClose,
}) => {
  const { user } = useAuth();
  const { currency } = useCurrency();

  // Month selector (Default: current month YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [showCodeDetails, setShowCodeDetails] = useState<boolean>(false);

  // Filter transactions for chosen month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const totalMonthSpend = useMemo(() => {
    return monthTransactions.reduce(
      (sum, t) => sum + (t.type === 'received' ? -t.amount : t.amount),
      0
    );
  }, [monthTransactions]);

  const monthSpent = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type !== 'received')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthReceived = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'received')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const handleDownload = () => {
    exportTransactionsToExcel(monthTransactions, selectedMonth, currency);
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

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-xl bg-[#ffffff] border border-[#cfbeaa] text-[#265c3b] flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-6 h-6 text-[#265c3b]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#24140a]">
                  Monthly Ledger Statement
                </h3>
                <span className="font-serif text-[11px] text-[#265c3b] bg-[#eff7f1] px-2 py-0.5 rounded border border-[#b9deb4]">
                  .XLSX Format
                </span>
              </div>
              <p className="text-xs text-[#6e5340] mt-0.5 font-serif italic">
                Generate and export complete double-entry statements for accounting review
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Notice */}
          <div className="bg-[#f4ede1] border border-[#dfd1bd] rounded-2xl p-4 text-xs text-[#594132] flex items-start gap-3">
            <Mail className="w-4 h-4 text-[#85261c] shrink-0 mt-0.5" />
            <div className="space-y-1 font-serif">
              <span className="text-xs font-bold text-[#2c1810] block">
                On-Demand Statement &amp; Monthly Dispatch
              </span>
              <p className="text-[#6e5340] text-[11px] leading-relaxed italic">
                Export your ledger statement anytime below. For automatic delivery on the last day of each month, an archival script can compile statements and deliver them to <span className="text-[#24140a] font-bold not-italic">{user?.email || 'your account email'}</span>.
              </p>
              <button
                type="button"
                onClick={() => setShowCodeDetails(!showCodeDetails)}
                className="text-[#6b4028] hover:text-[#24140a] font-bold inline-flex items-center gap-1 cursor-pointer pt-1 text-[11px]"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showCodeDetails ? 'Hide Automation Source' : 'View Scheduled Cron Script'}</span>
              </button>
            </div>
          </div>

          {/* Cloud Function Code Accordion */}
          {showCodeDetails && (
            <div className="bg-[#ffffff] text-[#3a2016] p-4 text-[11px] font-mono rounded-xl overflow-x-auto space-y-2 border border-[#cfbeaa]">
              <div className="text-[#6e5340] font-bold text-xs pb-1 border-b border-[#dfd1bd] flex items-center justify-between font-serif">
                <span>scripts/monthlyReport.js (Scheduled Dispatch Cron)</span>
                <span className="text-[#a63428]">CRON: 59 23 L * *</span>
              </div>
              <pre className="text-[#4a2c1d] leading-relaxed">
{`// Automated Monthly Statement Generator
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");

// Runs at 23:59 on the last day of every calendar month
async function sendMonthlyReport(userEmail, transactions) {
  // Query monthly transactions, format worksheet & email statement
}`}
              </pre>
            </div>
          )}

          {/* Month Selector & Instant Excel Generator */}
          <div className="bg-[#ffffff] border border-[#cfbeaa] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1.5">
                  Statement Period
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#8c7361] absolute left-3 top-2.5" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs font-serif bg-[#f7f3eb] border border-[#cfbeaa] rounded-xl text-[#24140a] focus:border-[#6b4028] outline-none transition"
                  />
                </div>
              </div>

              <div className="text-right font-serif">
                <span className="text-[11px] text-[#7d6350] block font-bold uppercase tracking-wider">Net Statement Total</span>
                <span
                  className={`text-xl sm:text-2xl font-bold tabular-nums ${
                    totalMonthSpend < 0 ? 'text-[#265c3b]' : 'text-[#24140a]'
                  }`}
                >
                  {formatCurrency(totalMonthSpend, currency)}
                </span>
                <span className="text-[11px] text-[#7d6350] block mt-0.5 italic">
                  Debits: {formatCurrency(monthSpent, currency)} | Credits: -{formatCurrency(monthReceived, currency)}
                </span>
              </div>
            </div>

            {/* Instant Download Button */}
            <button
              id="btn-download-excel-file"
              onClick={handleDownload}
              disabled={monthTransactions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 font-serif font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer btn-green-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download {monthLabel} Statement (.xlsx)</span>
            </button>
          </div>

          {/* Spreadsheet Preview */}
          <div>
            <h4 className="text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-2.5">
              Statement Data Preview ({monthTransactions.length} entries)
            </h4>

            {monthTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#7d6350] bg-[#f4ede1] border border-[#dfd1bd] rounded-xl font-serif italic">
                No ledger records found for {monthLabel}.
              </div>
            ) : (
              <div className="border border-[#cfbeaa] rounded-2xl overflow-hidden bg-[#ffffff] shadow-2xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f4ede1] text-[#4a2c1d] font-serif font-bold sticky top-0 border-b border-[#dfd1bd]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebdcc8]">
                      {monthTransactions.map((t) => {
                        const isReceived = t.type === 'received';
                        return (
                          <tr key={t.id} className="hover:bg-[#faf4ea]">
                            <td className="py-2 px-3 text-[#7d6350] font-serif italic">{t.date}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[10px] font-serif font-bold px-1.5 py-0.2 rounded border ${
                                  isReceived
                                    ? 'bg-[#eff7f1] text-[#265c3b] border-[#b9deb4]'
                                    : 'bg-[#fbf0ee] text-[#a63428] border-[#e8b6b0]'
                                }`}
                              >
                                {isReceived ? 'Credit' : 'Debit'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-serif font-bold text-[#24140a]">{t.reason}</td>
                            <td className="py-2 px-3 text-[#6e5340] font-serif">{t.category || 'General'}</td>
                            <td
                              className={`py-2 px-3 text-right font-serif font-bold tabular-nums ${
                                isReceived ? 'text-[#265c3b]' : 'text-[#a63428]'
                              }`}
                            >
                              {isReceived ? '+' : '-'}{formatCurrency(t.amount, currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[#f4ede1] border-t border-[#dfd1bd] font-serif font-bold text-[#24140a]">
                      <tr>
                        <td className="py-2.5 px-3 text-[#594132]" colSpan={4}>
                          Net Monthly Balance
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right text-sm tabular-nums accounting-double-rule ${
                            totalMonthSpend < 0 ? 'text-[#265c3b]' : 'text-[#24140a]'
                          }`}
                        >
                          {formatCurrency(totalMonthSpend, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#dfd1bd] bg-[#f4ede1] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-serif font-bold rounded-xl border border-[#cfbeaa] bg-[#ffffff] hover:bg-[#ede2ce] text-[#2c1810] cursor-pointer transition shadow-2xs"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
