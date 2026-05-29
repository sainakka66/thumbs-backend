import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import * as businessService from '../../services/businessService';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });

  async function load() {
    const data = await businessService.fetchAuditLogs({
      ...filters,
      limit: 100,
    });
    setLogs(data.logs || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <div className="page-container">
      <PageHeader title="Audit Trail" subtitle="Searchable log of business actions" />

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
            <button type="button" onClick={load} className="rounded bg-brand px-4 py-2 text-sm font-medium text-white">
              Search
            </button>
          </div>
        </CardBody>
      </Card>

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
    </div>
  );
}
