import * as XLSX from 'xlsx';
import { SpendingTransaction } from '../types';

export function formatCurrency(amount: number, currencySymbol: string = '$'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate an Excel file (.xlsx) from transactions with columns:
 * Date, Reason, Amount, and a final summary row: "Total Monthly Spend"
 */
export function exportTransactionsToExcel(
  transactions: SpendingTransaction[],
  periodTitle: string,
  currencySymbol: string = '$'
) {
  // Sort by date ascending
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  
  const rows: Array<Record<string, string | number>> = sorted.map((t) => ({
    Date: t.date,
    Reason: t.reason,
    Category: t.category || 'General',
    Amount: Number(t.amount.toFixed(2)),
  }));

  const total = sorted.reduce((sum, t) => sum + t.amount, 0);

  // Append empty row for spacing
  rows.push({
    Date: '',
    Reason: '',
    Category: '',
    Amount: '',
  });

  // Final summary row as required: "Total Monthly Spend"
  rows.push({
    Date: 'Summary',
    Reason: 'Total Monthly Spend',
    Category: '',
    Amount: Number(total.toFixed(2)),
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 14 }, // Date
    { wch: 35 }, // Reason
    { wch: 18 }, // Category
    { wch: 16 }, // Amount
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Spending');

  const fileName = `Ledgerly_Spending_Report_${periodTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
