import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { AuditLog } from '@shared/audit';
// Zamijenjeno prema novoj modularnoj API strukturi
// Ispravljeno: koristi apiMisc jer ne postoji apiAudit modul
import { getAuditLogs } from '../../utils/api/apiMisc';
import { parseISO } from 'date-fns';
import { formatDate } from "../../utils/dateUtils";
import { useTranslation } from 'react-i18next';

const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof AuditLog>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: '',
    status: '',
    user: '',
  });

  // Definicija funkcija prije njihovog korištenja u useEffect
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const logs = await getAuditLogs();
      setAuditLogs(logs);
      setFilteredLogs(logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...auditLogs];

    if (filters.startDate) {
      filtered = filtered.filter(log => 
        parseISO(log.created_at) >= parseISO(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(log => 
        parseISO(log.created_at) <= parseISO(filters.endDate)
      );
    }

    if (filters.actionType) {
      filtered = filtered.filter(log => 
        log.action_type.toLowerCase().includes(filters.actionType.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(log => 
        log.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    if (filters.user) {
      filtered = filtered.filter(log => 
        (log.performer_name || '').toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [auditLogs, filters]);

  // Dohvat audit logova pri mountanju komponente
  useEffect(() => {
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Primjena filtera kada se promijene audit logovi ili filteri
  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters, applyFilters]);

  const handleSort = (field: keyof AuditLog) => {
    setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    setSortField(field);
    
    const sorted = [...filteredLogs].sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];
      
      if (valueA === undefined || valueB === undefined) {
        return 0;
      }
      
      if (sortDirection === 'asc') {
        return String(valueA) > String(valueB) ? 1 : -1;
      }
      return String(valueA) < String(valueB) ? 1 : -1;
    });
    
    setFilteredLogs(sorted);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('auditLogs.title')}</h1>
        <p className="opacity-90">{t('auditLogs.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('auditLogs.filterLogs')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">{t('auditLogs.filters.dateRange')}</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auditLogs.filters.actionType')}</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
              >
                <option value="">{t('auditLogs.actionTypes.all')}</option>
                <option value="LOGIN">{t('auditLogs.actionTypes.login')}</option>
                <option value="CREATE">{t('auditLogs.actionTypes.create')}</option>
                <option value="UPDATE">{t('auditLogs.actionTypes.update')}</option>
                <option value="DELETE">{t('auditLogs.actionTypes.delete')}</option>
                <option value="PASSWORD">{t('auditLogs.actionTypes.password')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auditLogs.filters.status')}</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">{t('auditLogs.statuses.all')}</option>
                <option value="success">{t('auditLogs.statuses.success')}</option>
                <option value="error">{t('auditLogs.statuses.error')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auditLogs.filters.user')}</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder={t('auditLogs.filters.searchByUser')}
                value={filters.user}
                onChange={(e) => handleFilterChange('user', e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left cursor-pointer" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">
                      {t('auditLogs.table.timestamp')}
                      {sortField === 'created_at' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                    </div>
                  </th>
                  <th className="py-2 px-4 text-left cursor-pointer" onClick={() => handleSort('action_type')}>
                    <div className="flex items-center">
                      {t('auditLogs.table.action')}
                      {sortField === 'action_type' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                    </div>
                  </th>
                  <th className="py-2 px-4 text-left">{t('auditLogs.table.performedBy')}</th>
                  <th className="py-2 px-4 text-left">{t('auditLogs.table.details')}</th>
                  <th className="py-2 px-4 text-left">{t('auditLogs.table.status')}</th>
                  <th className="py-2 px-4 text-left">{t('auditLogs.table.ipAddress')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.log_id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{formatDate(log.created_at, "dd.MM.yyyy HH:mm:ss")}</td>
                    <td className="py-2 px-4">{log.action_type}</td>
                    <td className="py-2 px-4">{log.performer_name}</td>
                    <td className="py-2 px-4">{log.action_details}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-4">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPage;