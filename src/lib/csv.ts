/**
 * CSV utilities: escape, download, parse. Used for tasks, time entries, and invoices import/export.
 */

export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const lineSeparator = '\r\n';
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join(lineSeparator);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseCsv(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      const rows: string[][] = [];
      let row: string[] = [];
      let cell = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
          if (c === '"') {
            if (text[i + 1] === '"') {
              cell += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            cell += c;
          }
        } else {
          if (c === '"') {
            inQuotes = true;
          } else if (c === ',' || c === ';') {
            row.push(cell.trim());
            cell = '';
          } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell.trim());
            cell = '';
            if (row.some((v) => v !== '')) rows.push(row);
            row = [];
          } else {
            cell += c;
          }
        }
      }
      if (cell !== '' || row.length > 0) {
        row.push(cell.trim());
        rows.push(row);
      }
      resolve(rows);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

// --- Template headers (user downloads these as empty CSV to know format for import) ---

export const TASKS_CSV_HEADERS = [
  'title',
  'description',
  'status',
  'priority',
  'due_date',
  'estimated_hours',
  'project_name',
];

export const TIME_ENTRIES_CSV_HEADERS = [
  'start_time',
  'end_time',
  'duration_minutes',
  'description',
  'billable',
  'hourly_rate',
  'project_name',
  'task_title',
];

export const INVOICES_CSV_HEADERS = [
  'invoice_number',
  'issue_date',
  'due_date',
  'status',
  'client_name',
  'project_name',
  'notes',
];

export const INVOICE_ITEMS_CSV_HEADERS = [
  'invoice_number',
  'description',
  'quantity',
  'unit_price',
  'amount',
  'line_description',
];

export function getTasksTemplateRows(): string[][] {
  return [TASKS_CSV_HEADERS];
}

export function getTimeEntriesTemplateRows(): string[][] {
  return [TIME_ENTRIES_CSV_HEADERS];
}

export function getInvoicesTemplateRows(): string[][] {
  return [INVOICES_CSV_HEADERS];
}

export function getInvoiceItemsTemplateRows(): string[][] {
  return [INVOICE_ITEMS_CSV_HEADERS];
}
