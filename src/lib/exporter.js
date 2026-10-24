// Export any report table on screen to Excel or PDF. Columns without a heading (row actions) are left out.
import * as XLSX from 'xlsx';

function readTable(table) {
    const cells = (tr) => [...tr.children].map(c => (c.innerText || '').replace(/\s+/g, ' ').trim());
    let head = [...table.querySelectorAll('thead tr')].map(cells)[0];
    let body = [...table.querySelectorAll('tbody tr')].map(cells);
    if (!head) { const all = [...table.querySelectorAll('tr')].map(cells); head = all[0] || []; body = all.slice(1); }
    const keep = head.map((h, i) => h !== '' || body.some(r => (r[i] || '') !== '')).map((k, i) => k && head[i] !== '');
    return { head: head.filter((_, i) => keep[i]), body: body.map(r => r.filter((_, i) => keep[i])).filter(r => r.some(v => v !== '')) };
}

const stamp = () => new Date().toISOString().slice(0, 10);
const safe = (s) => String(s || 'report').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

export function exportExcel(tables, name) {
    const wb = XLSX.utils.book_new();
    tables.forEach((t, i) => {
        const { head, body } = readTable(t);
        const ws = XLSX.utils.aoa_to_sheet([head, ...body.map(r => r.map(v => (/^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(v) ? Number(v.replace(/,/g, '')) : v)))]);
        ws['!cols'] = head.map((h, c) => ({ wch: Math.min(40, Math.max(10, h.length + 2, ...body.map(r => String(r[c] || '').length + 1))) }));
        XLSX.utils.book_append_sheet(wb, ws, ((tables.length > 1 ? `${i + 1} ` : '') + String(name || 'Report').replace(/[\\/?*[\]:]/g, ' ')).slice(0, 31));
    });
    XLSX.writeFile(wb, `payport-${safe(name)}-${stamp()}.xlsx`);
}

export async function exportPdf(tables, name) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text(`PayPort — ${name}`, 36, 36);
    doc.setFontSize(9);
    doc.text(`Exported ${new Date().toLocaleString()}`, 36, 52);
    let y = 64;
    tables.forEach((t) => {
        const { head, body } = readTable(t);
        autoTable(doc, { head: [head], body, startY: y, margin: { left: 24, right: 24 }, styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { fillColor: [6, 163, 218], textColor: 255 }, alternateRowStyles: { fillColor: [244, 248, 251] } });
        y = doc.lastAutoTable.finalY + 18;
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 16); }
    doc.save(`payport-${safe(name)}-${stamp()}.pdf`);
}
