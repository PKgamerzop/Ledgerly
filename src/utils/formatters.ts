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
  
  const rows: Array<Record<string, string | number>> = sorted.map((t) => {
    const isReceived = t.type === 'received';
    return {
      Date: t.date,
      Type: isReceived ? 'Received' : 'Spent',
      Reason: t.reason,
      Category: t.category || 'General',
      // Received amounts are negative values so totaling automatically subtracts them
      Amount: isReceived ? -Number(t.amount.toFixed(2)) : Number(t.amount.toFixed(2)),
    };
  });

  // Net total: spent amounts add, received amounts subtract
  const netTotal = sorted.reduce(
    (sum, t) => sum + (t.type === 'received' ? -t.amount : t.amount),
    0
  );

  // Append empty row for spacing
  rows.push({
    Date: '',
    Type: '',
    Reason: '',
    Category: '',
    Amount: '',
  });

  // Final summary row as required: "Net Total Monthly Spend"
  rows.push({
    Date: 'Summary',
    Type: '',
    Reason: 'Net Total Spend (Spent - Received)',
    Category: '',
    Amount: Number(netTotal.toFixed(2)),
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 14 }, // Date
    { wch: 12 }, // Type
    { wch: 35 }, // Reason
    { wch: 18 }, // Category
    { wch: 16 }, // Amount
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Spending Report');

  const fileName = `Ledgerly_Spending_Report_${periodTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
