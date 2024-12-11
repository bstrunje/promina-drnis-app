// src/features/audit/AuditLogsPage.tsx
import React, { useEffect, useState } from 'react';
import { AuditLog } from '@promina-drnis-app/shared/types/audit';
import { getAuditLogs } from '../../utils/api';

const AuditLogsPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const logs = await getAuditLogs();
      setAuditLogs(logs);
      setError(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Audit Logs</h1>
      {auditLogs.length === 0 ? (
        <p>No audit logs found.</p>
      ) : (
        auditLogs.map((log) => (
          <div key={log.log_id}>
            <p>{log.action_type} - {new Date(log.created_at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default AuditLogsPage;