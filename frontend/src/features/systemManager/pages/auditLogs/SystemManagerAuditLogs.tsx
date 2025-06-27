// features/systemManager/pages/auditLogs/SystemManagerAuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { AuditLog } from '@shared/audit';
import { formatDate, parseDate, setCurrentTimeZone } from "../../../../utils/dateUtils";
import { useToast } from '@components/ui/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { useTimeZone } from '../../../../context/TimeZoneContext';
import { useNavigate } from 'react-router-dom';

const SystemManagerAuditLogs: React.FC = () => {
  // const { manager } = useSystemManager(); // Uklonjeno jer nije korišteno
  const { toast } = useToast();
  const { timeZone } = useTimeZone();
  const navigate = useNavigate();

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
          title: "Greška",
          description: "Niste prijavljeni kao System Manageristrator.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/system-manager/audit-logs`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      // Provjeri da je response.data niz tipa AuditLog[]
      if (Array.isArray(response.data)) {
        setAuditLogs(response.data as AuditLog[]);
        setFilteredLogs(response.data as AuditLog[]);
      } else {
        setAuditLogs([]);
        setFilteredLogs([]);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast({
        title: "Greška",
        description: "Dogodila se greška prilikom dohvata revizijskih zapisa.",
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
      <div className="mb-4">
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Povratak
        </Button>
      </div>

      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Revizijski zapisi sustava</h1>
        <p className="opacity-90">Pregled svih aktivnosti u sustavu</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtriraj zapise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Vremenski raspon</label>
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
              <label className="block text-sm font-medium mb-1">Vrsta akcije</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
              >
                <option value="">Sve</option>
                <option value="LOGIN">Prijava</option>
                <option value="LOGOUT">Odjava</option>
                <option value="UPDATE">Ažuriranje</option>
                <option value="CREATE">Kreiranje</option>
                <option value="DELETE">Brisanje</option>
                <option value="SYSTEM">Sistemska akcija</option>
                <option value="SYSTEM_ADMIN">System Manager akcija</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Svi</option>
                <option value="success">Uspješno</option>
                <option value="error">Greška</option>
                <option value="warning">Upozorenje</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Korisnik</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="Pretražite po korisniku..."
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('log_id')}
                >
                  ID
                  {sortField === 'log_id' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  Vrijeme
                  {sortField === 'created_at' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('action_type')}
                >
                  Akcija
                  {sortField === 'action_type' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('performed_by')}
                >
                  Korisnik
                  {sortField === 'performed_by' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {sortField === 'status' && (
                    <span className="ml-1 inline-block">
                      {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Detalji
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.log_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at, 'dd.MM.yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.performer_name ? (
                        <span className="font-medium text-gray-900">{log.performer_name}</span>
                      ) : log.performed_by ? (
                        <span>
                          Korisnik <span className="text-blue-600 font-medium">#{log.performed_by}</span>
                        </span>
                      ) : (
                        <span className="italic">Sustav</span>
                      )}
                      {log.affected_name && (
                        <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
                          Za člana: {log.affected_name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {log.action_details || 'Nema detalja'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nisu pronađeni zapisi koji odgovaraju zadanim kriterijima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500">
          Ukupno zapisa: {filteredLogs.length} (od {auditLogs.length})
        </div>
      </div>
    </div>
  );
};

export default SystemManagerAuditLogs;
