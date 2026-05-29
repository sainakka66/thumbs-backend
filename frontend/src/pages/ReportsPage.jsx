import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import * as businessService from '../services/businessService';

const REPORTS = [
  { id: 'sales', label: 'Sales Report' },
  { id: 'inventory', label: 'Inventory Report' },
  { id: 'customers', label: 'Customer Report' },
  { id: 'deliveries', label: 'Delivery Report' },
];

export default function ReportsPage() {
  const [range, setRange] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState('');

  async function exportReport(type, format) {
    setLoading(`${type}-${format}`);
    try {
      const data = await businessService.fetchReport(type, { range, from, to, format });
      if (format === 'csv' || format === 'excel') {
        const blob = new Blob([data], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${type}-report.csv`;
        a.click();
      }
    } catch (e) {
      alert(e.message || 'Export failed');
    } finally {
      setLoading('');
    }
  }

  async function pdfInventory() {
    try {
      await businessService.downloadPdf('/pdf/inventory-report', 'inventory-report.pdf');
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="page-container pb-20 lg:pb-0">
      <PageHeader title="Reports" subtitle="Export business data for accounting and review" />

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {['today', 'week', 'month', 'custom'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize ${
                  range === r ? 'bg-brand text-white' : 'bg-surface border border-border text-sub'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="mt-4 flex flex-wrap gap-3">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-border bg-surface px-3 py-2 text-sm" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-border bg-surface px-3 py-2 text-sm" />
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.id}>
            <CardBody>
              <h3 className="font-head text-lg font-bold">{r.label}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!!loading} onClick={() => exportReport(r.id, 'csv')}>
                  CSV
                </Button>
                <Button variant="secondary" disabled={!!loading} onClick={() => exportReport(r.id, 'excel')}>
                  Excel
                </Button>
                {r.id === 'inventory' && (
                  <Button variant="primary" disabled={!!loading} onClick={pdfInventory}>
                    PDF
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
