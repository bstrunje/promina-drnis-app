// features/systemManager/pages/auditLogs/SystemManagerAuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { AuditLog } from '@shared/audit';
import { formatDate, parseDate, setCurrentTimeZone } from "../../../../utils/dateUtils";
import { useToast } from '@components/ui/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { useTimeZone } from '../../../../context/useTimeZone';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { useSystemManagerNavigation } from '../../hooks/useSystemManagerNavigation';
import ManagerHeader from '../../components/common/ManagerHeader';
import ManagerTabNav from '../../components/common/ManagerTabNav';

interface SystemManagerAuditLogsProps {
  standalone?: boolean;
}

const SystemManagerAuditLogs: React.FC<SystemManagerAuditLogsProps> = ({ standalone = true }) => {
  const { manager } = useSystemManager();
  const { toast } = useToast();
  const { timeZone } = useTimeZone();
  const { navigateTo } = useSystemManagerNavigation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  useEffect(() => {
    // Efekt koji osigurava da se odabrana vremenska zona koristi prilikom formatiranja datuma
    if (timeZone) {
      setCurrentTimeZone(timeZone);
    }
  }, [timeZone]); // Efekt se pokreće kada se promijeni timeZone

  // Handler za filtriranje logova - koristi useCallback zbog dependency arraya
  const applyFilters = React.useCallback(() => {
    let filtered = [...auditLogs];

    if (filters.startDate) {
      filtered = filtered.filter(log => {
        const logDate = String(log.created_at ?? '');
        const startDate = String(filters.startDate ?? '');
        const parsedLogDate = parseDate(logDate);
        const parsedStartDate = parseDate(startDate);
        if (parsedLogDate === null || parsedLogDate === undefined) return false;
        if (parsedStartDate === null || parsedStartDate === undefined) return false;
        return parsedLogDate >= parsedStartDate;
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter(log => {
        const logDate = String(log.created_at ?? '');
        const endDate = String(filters.endDate ?? '');
        const parsedLogDate = parseDate(logDate);
        const parsedEndDate = parseDate(endDate);
        if (parsedLogDate === null || parsedLogDate === undefined) return false;
        if (parsedEndDate === null || parsedEndDate === undefined) return false;
        return parsedLogDate <= parsedEndDate;
      });
    }

    if (filters.actionType) {
      filtered = filtered.filter(log => {
        const actionType = typeof log.action_type === 'string' ? log.action_type : '';
        const filterActionType = typeof filters.actionType === 'string' ? filters.actionType : '';
        return actionType.toLowerCase().includes(filterActionType.toLowerCase());
      });
    }

    if (filters.status) {
      filtered = filtered.filter(log => {
        const status = typeof log.status === 'string' ? log.status : '';
        const filterStatus = typeof filters.status === 'string' ? filters.status : '';
        return status.toLowerCase() === filterStatus.toLowerCase();
      });
    }

    if (filters.user) {
      filtered = filtered.filter(log => {
        const performer = typeof log.performer_name === 'string' ? log.performer_name : '';
        const filterUser = typeof filters.user === 'string' ? filters.user : '';
        return performer.toLowerCase().includes(filterUser.toLowerCase());
      });
    }

    setFilteredLogs(filtered);
  }, [auditLogs, filters]);

  // Handler za dohvat audit logova
  const fetchAuditLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      // Dohvat tokena iz localStorage-a
      const token = localStorage.getItem('systemManagerToken');
      if (!token) {
        toast({
          title: "Error",
          description: "You are not logged in as System Manager.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      const response = await axios.get<{ logs: AuditLog[] }>(`${API_BASE_URL}/system-manager/audit-logs`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      // Provjeri da response.data ima logs polje
      if (response.data && Array.isArray(response.data.logs)) {
        setAuditLogs(response.data.logs);
        setFilteredLogs(response.data.logs);
      } else {
        setAuditLogs([]);
        setFilteredLogs([]);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast({
        title: "Error",
        description: "An error occurred while fetching audit logs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchAuditLogs(); // void zbog lint pravila
  }, [fetchAuditLogs]);

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

      // Handle numbers, dates, and strings explicitly
      const getComparable = (val: unknown) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return val.toLowerCase();
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'object' && val !== null) {
          if (val instanceof Date) return val.getTime();
          return JSON.stringify(val);
        }
        return '';
      };

      const compA = getComparable(valueA);
      const compB = getComparable(valueB);

      if (sortDirection === 'asc') {
        if (compA > compB) return 1;
        if (compA < compB) return -1;
        return 0;
      }
      if (compA < compB) return 1;
      if (compA > compB) return -1;
      return 0;
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
    <div className={standalone ? "min-h-screen bg-gray-50" : ""}>
      {/* Header - samo ako je standalone */}
      {standalone && (
        <>
          <ManagerHeader 
            manager={manager} 
            onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
            isMenuOpen={isMenuOpen}
          />

          {/* Navigation */}
          <ManagerTabNav 
            activeTab="audit-logs" 
            setActiveTab={(tab) => {
              if (tab === 'dashboard') navigateTo('/system-manager/dashboard');
              else if (tab === 'settings') navigateTo('/system-manager/settings');
              else if (tab === 'members') navigateTo('/system-manager/members');
              else if (tab === 'register-members') navigateTo('/system-manager/register-members');
              else if (tab === 'organizations') navigateTo('/system-manager/organizations');
              else if (tab === 'support') navigateTo('/system-manager/support');
              else if (tab === 'audit-logs') navigateTo('/system-manager/audit-logs');
            }}
            isMenuOpen={isMenuOpen}
            onMenuClose={() => setIsMenuOpen(false)}
          />
        </>
      )}

      <div className={standalone ? "p-4 sm:p-6" : ""}>
        {/* Filter Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Filter Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Time Range - full width on mobile */}
              <div>
                <label className="block text-sm font-medium mb-1">Time Range</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="w-full p-2 border rounded text-sm"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-full p-2 border rounded text-sm"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              
              {/* Other filters in grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Action Type</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
              >
                <option value="">All</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="UPDATE">Update</option>
                <option value="CREATE">Create</option>
                <option value="DELETE">Delete</option>
                <option value="SYSTEM">System Action</option>
                <option value="SYSTEM_ADMIN">System Manager Action</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">User</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="Search by user..."
                value={filters.user}
                onChange={(e) => handleFilterChange('user', e.target.value)}
              />
            </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Logs Table - responsive with horizontal scroll */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-1 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('log_id')}
                >
                  ID
                  {sortField === 'log_id' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-1 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  Time
                  {sortField === 'created_at' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-1 sm:px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('action_type')}
                >
                  Action
                  {sortField === 'action_type' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-1 sm:px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('performed_by')}
                >
                  User
                  {sortField === 'performed_by' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-1 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {sortField === 'status' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-1 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="px-1 sm:px-3 py-1.5 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {log.log_id}
                    </td>
                    <td className="px-1 sm:px-3 py-1.5 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      <span className="sm:hidden">{formatDate(log.created_at, 'dd.MM HH:mm')}</span>
                      <span className="hidden sm:inline">{formatDate(log.created_at, 'dd.MM.yyyy HH:mm:ss')}</span>
                    </td>
                    <td className="px-1 sm:px-2 py-1.5 sm:py-3 whitespace-nowrap">
                      <span className={`px-1 sm:px-2 py-0.5 inline-flex text-xs sm:text-sm font-semibold rounded ${
                        log.action_type.includes('LOGIN') ? 'bg-green-100 text-green-800' :
                        log.action_type.includes('LOGOUT') ? 'bg-yellow-100 text-yellow-800' :
                        log.action_type.includes('UPDATE') ? 'bg-blue-100 text-blue-800' :
                        log.action_type.includes('CREATE') ? 'bg-purple-100 text-purple-800' :
                        log.action_type.includes('DELETE') ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-1 sm:px-2 py-1.5 sm:py-3 text-xs sm:text-sm text-gray-500">
                      <div className="max-w-[120px] sm:max-w-xs truncate">
                        {log.performer_name ?? log.performer_type ?? 'System'}
                      </div>
                    </td>
                    <td className="px-1 sm:px-3 py-1.5 sm:py-3 whitespace-nowrap">
                      <span className={`px-1 sm:px-2 py-0.5 inline-flex text-xs sm:text-sm font-semibold rounded ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-1 sm:px-3 py-1.5 sm:py-3 text-xs sm:text-sm text-gray-500">
                      <div className="max-w-[180px] sm:max-w-md truncate" title={log.action_details || 'No details'}>
                        {log.action_details || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No records found matching the specified criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 text-xs sm:text-sm text-gray-500">
          Total records: {filteredLogs.length} (of {auditLogs.length})
        </div>
      </div>
      </div>
    </div>
  );
};

export default SystemManagerAuditLogs;
