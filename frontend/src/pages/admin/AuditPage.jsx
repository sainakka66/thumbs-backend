import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import * as businessService from '../../services/businessService';

const PAGE_SIZE = 50;

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });

  async function load(nextOffset = offset) {
    const data = await businessService.fetchAuditLogs({
      ...filters,
      limit: PAGE_SIZE,
      offset: nextOffset,
    });
    setLogs(data.logs || []);
    setTotal(data.total ?? data.logs?.length ?? 0);
    setOffset(nextOffset);
  }

  useEffect(() => {
    load(0).catch(console.error);
  }, []);

  async function exportCsv() {
    const csv = await businessService.exportAuditCsv(filters);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page-container">
      <PageHeader title="Audit Logs" subtitle="Searchable log of business actions" />

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Action (e.g. sale_create)"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="rounded border border-border bg-surface px-3 py-2 text-sm"
            />
            <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="rounded border border-border bg-surface px-3 py-2 text-sm" />
            <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="rounded border border-border bg-surface px-3 py-2 text-sm" />
            <Button type="button" onClick={() => load(0)}>
              Search
            </Button>
            <Button type="button" variant="ghost" onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      <p className="mb-2 text-sm text-muted">
        Showing {logs.length} of {total} entries
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border/50">
                <td className="p-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                <td className="p-3">{log.username || log.user_id}</td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3">
                  {log.entity_type}
                  {log.entity_id ? ` #${log.entity_id}` : ''}
                </td>
                <td className="p-3 text-muted">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <p className="p-6 text-center text-muted">No audit entries found.</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="ghost" disabled={offset <= 0} onClick={() => load(Math.max(0, offset - PAGE_SIZE))}>
          Previous
        </Button>
        <Button type="button" variant="ghost" disabled={offset + PAGE_SIZE >= total} onClick={() => load(offset + PAGE_SIZE)}>
          Next
        </Button>
      </div>
    </div>
  );
}
