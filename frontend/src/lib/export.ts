export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const content = '\uFEFF' + rows.map(row => row.map(value => {
    let cell = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
