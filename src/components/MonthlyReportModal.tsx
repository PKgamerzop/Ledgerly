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
    return monthTransactions.reduce((sum, t) => sum + t.amount, 0);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0c3744] to-[#124d5e] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 text-teal-200 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black">Monthly Excel Report</h3>
              <p className="text-xs text-teal-200 mt-0.5">
                Generate, preview, and download monthly statements (.xlsx)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Automated Cloud Function Notice */}
          <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 text-xs text-teal-950 flex items-start gap-3">
            <Mail className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-teal-900 block">
                Instant Download & Automated Delivery:
              </span>
              <p className="text-teal-800 leading-relaxed">
                You can download your full monthly Excel statement anytime below with one click. For automated cloud delivery, a scheduled serverless function can be configured to run on the last day of each month and send reports directly to <strong className="text-teal-950">{user?.email || 'your registered email'}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowCodeDetails(!showCodeDetails)}
                className="text-teal-800 hover:text-teal-950 font-bold underline inline-flex items-center gap-1 cursor-pointer pt-1"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showCodeDetails ? 'Hide Function Code' : 'View Scheduled Delivery Script'}
              </button>
            </div>
          </div>

          {/* Cloud Function Code Accordion */}
          {showCodeDetails && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-[11px] font-mono overflow-x-auto space-y-2 border border-slate-800">
              <div className="text-slate-400 font-sans font-semibold text-xs pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>functions/index.js (Firebase Cloud Function)</span>
                <span className="text-teal-400">Scheduled: Last day of month</span>
              </div>
              <pre className="text-teal-300 leading-relaxed">
{`const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Runs at 23:59 on the last day of every month
exports.monthlySpendingReport = onSchedule("59 23 28-31 * *", async (event) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (tomorrow.getMonth() === today.getMonth()) return; // only run on actual last day

  // Query each user's transactions for the month, generate .xlsx & send via Nodemailer
});`}
              </pre>
            </div>
          )}

          {/* Month Selector & Instant Excel Generator */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Month to Export
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total for {monthLabel}</span>
                <span className="text-xl sm:text-2xl font-black text-[#0c3744]">
                  {formatCurrency(totalMonthSpend, currency)}
                </span>
              </div>
            </div>

            {/* Instant Download Button */}
            <button
              id="btn-download-excel-file"
              onClick={handleDownload}
              disabled={monthTransactions.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download {monthLabel} Statement (.xlsx)</span>
            </button>
          </div>

          {/* Spreadsheet Preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Report Spreadsheet Preview ({monthTransactions.length} records)
            </h4>

            {monthTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No spending transactions recorded for {monthLabel}.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-600">{t.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{t.reason}</td>
                          <td className="py-2 px-3 text-slate-500">{t.category || 'General'}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(t.amount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-teal-50/70 border-t-2 border-teal-600/40 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-teal-900" colSpan={3}>
                          Total Monthly Spend
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-sm text-[#0c3744]">
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
