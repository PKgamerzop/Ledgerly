import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { SpendingTransaction } from '../types';
import { exportTransactionsToExcel, formatCurrency, formatDateDisplay } from '../utils/formatters';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Mail,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="mc-panel max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] p-0">
        {/* Modal Header */}
        <div className="bg-[#1c1814] border-b-2 border-[#120f0c] text-white p-6 relative">
          <button
            onClick={onClose}
            className="mc-button absolute right-4 top-4 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#120f0c] border-2 border-black flex items-center justify-center shadow-[inset_1px_1px_0_#2a231d,inset_-1px_-1px_0_#0a0806]">
              <FileSpreadsheet className="w-6 h-6 text-[#55ff55]" />
            </div>
            <div>
              <h3 className="font-pixel text-xl sm:text-2xl text-[#ffd700] drop-shadow-[2px_2px_0_#000]">
                Monthly Excel Report
              </h3>
              <p className="font-mc text-xs text-[#a0a0a0] mt-0.5">
                Generate, preview, and download monthly statements (.xlsx)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#2b2520]">
          {/* Automated Notice */}
          <div className="mc-panel bg-[#1a281a] border-2 border-[#0f1f0f] p-4 text-xs text-[#aaffaa] flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#55ff55] shrink-0 mt-0.5" />
            <div className="space-y-1 font-mc">
              <span className="font-pixel text-xs text-[#55ff55] block">
                Instant Download & Automated Delivery:
              </span>
              <p className="text-[#a0cca0] leading-relaxed text-[11px]">
                You can download your full monthly Excel statement anytime below with one click. For automated cloud delivery, a scheduled serverless function can be configured to run on the last day of each month and send reports directly to <strong className="text-[#ffffff]">{user?.email || 'your registered email'}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowCodeDetails(!showCodeDetails)}
                className="text-[#55ffff] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer pt-1"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showCodeDetails ? 'Hide Function Code' : 'View Scheduled Delivery Script'}
              </button>
            </div>
          </div>

          {/* Cloud Function Code Accordion */}
          {showCodeDetails && (
            <div className="bg-[#161310] text-[#55ff55] p-4 text-[11px] font-mono overflow-x-auto space-y-2 border-2 border-black">
              <div className="text-[#888888] font-mc font-semibold text-xs pb-1 border-b border-[#2b2520] flex items-center justify-between">
                <span>scripts/monthlyReport.js (Scheduled Cron Script)</span>
                <span className="text-[#ffd700]">Scheduled: Last day of month</span>
              </div>
              <pre className="text-[#55ffff] leading-relaxed">
{`// Automated Monthly Statement Generator
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");

// Runs at 23:59 on the last day of every month
async function sendMonthlyReport(userEmail, transactions) {
  // Query monthly transactions, format worksheet & email statement
}`}
              </pre>
            </div>
          )}

          {/* Month Selector & Instant Excel Generator */}
          <div className="mc-panel p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1">
                  Select Month to Export
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="mc-input pl-9 pr-3 py-1.5 text-xs text-[#ffffff]"
                  />
                </div>
              </div>

              <div className="text-right">
                <span className="font-mc text-xs text-[#888888] block">Net Total for {monthLabel}</span>
                <span
                  className={`font-pixel text-xl sm:text-2xl ${
                    totalMonthSpend < 0 ? 'text-[#55ff55]' : 'text-[#ffd700]'
                  }`}
                >
                  {formatCurrency(totalMonthSpend, currency)}
                </span>
                <span className="font-mc text-[10px] text-[#888888] block mt-0.5">
                  Spent: {formatCurrency(monthSpent, currency)} | Recv: -{formatCurrency(monthReceived, currency)}
                </span>
              </div>
            </div>

            {/* Instant Download Button */}
            <button
              id="btn-download-excel-file"
              onClick={handleDownload}
              disabled={monthTransactions.length === 0}
              className="mc-button mc-button-emerald w-full flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm cursor-pointer disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Download {monthLabel} Statement (.xlsx)</span>
            </button>
          </div>

          {/* Spreadsheet Preview */}
          <div>
            <h4 className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-2">
              Report Spreadsheet Preview ({monthTransactions.length} records)
            </h4>

            {monthTransactions.length === 0 ? (
              <div className="text-center py-8 font-mc text-xs text-[#888888] mc-panel">
                No spending transactions recorded for {monthLabel}.
              </div>
            ) : (
              <div className="border-2 border-black overflow-hidden bg-[#161310]">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mc">
                    <thead className="bg-[#1e1914] text-[#ffd700] font-pixel sticky top-0 border-b-2 border-black">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26201b]">
                      {monthTransactions.map((t) => {
                        const isReceived = t.type === 'received';
                        return (
                          <tr key={t.id} className="hover:bg-[#201b16]">
                            <td className="py-2 px-3 font-mono text-[#aaaaaa]">{t.date}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`font-pixel text-[9px] px-1.5 py-0.5 border ${
                                  isReceived
                                    ? 'bg-[#1b3d1b] text-[#55ff55] border-[#2e7d32]'
                                    : 'bg-[#3d1b1b] text-[#ff7777] border-[#8b2525]'
                                }`}
                              >
                                {isReceived ? 'Received' : 'Spent'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-bold text-[#ffffff]">{t.reason}</td>
                            <td className="py-2 px-3 text-[#888888]">{t.category || 'General'}</td>
                            <td
                              className={`py-2 px-3 text-right font-pixel ${
                                isReceived ? 'text-[#55ff55]' : 'text-[#ff5555]'
                              }`}
                            >
                              {isReceived ? '+' : '-'}{formatCurrency(t.amount, currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[#1e1914] border-t-2 border-black font-pixel text-[#ffffff]">
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-[#ffd700]" colSpan={4}>
                          Net Total Monthly Spend
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-pixel text-sm ${
                            totalMonthSpend < 0 ? 'text-[#55ff55]' : 'text-[#ff5555]'
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
        <div className="px-6 py-4 border-t-2 border-[#15120e] bg-[#1e1914] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mc-button px-4 py-2 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
