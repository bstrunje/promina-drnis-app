import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Settings, ArrowLeft, Eye, MessageSquare, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supportTicketApi } from '../../utils/api/supportTicketApi';
import { SupportTicket, TicketStatus, TicketPriority, TICKET_CATEGORY_LABELS, TICKET_CATEGORY_COLORS, TICKET_STATUS_LABELS } from '@shared/supportTicket';
import { TicketDetailModal } from './TicketDetailModal';
import { useToast } from '@components/ui/use-toast';
import { useSystemManagerNavigation } from './hooks/useSystemManagerNavigation';
import { useSystemManager } from '../../context/SystemManagerContext';

export const GlobalSupportManagementPage: React.FC = () => {
  const { toast } = useToast();
  const { navigateTo } = useSystemManagerNavigation();
  const { manager } = useSystemManager();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  });

  // GSM može vidjeti sve tickete iz svih organizacija
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      // GSM uvijek koristi getTickets (svi ticketi)
      const response = await supportTicketApi.getTickets({}, 1, 50);
      setTickets(response.tickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadStats = async () => {
    try {
      const response = await supportTicketApi.getTicketStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    // Provjeri da je stvarno GSM (organization_id = null)
    if (manager?.organization_id !== null) {
      console.warn('GlobalSupportManagementPage: Not a Global System Manager');
      navigateTo('/system-manager/dashboard');
      return;
    }

    void loadTickets();
    void loadStats();
  }, [loadTickets, manager?.organization_id, navigateTo]);

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdated = () => {
    setSelectedTicket(null);
    void loadTickets();
    void loadStats();
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case TicketStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case TicketStatus.RESOLVED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case TicketStatus.CLOSED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigateTo('/system-manager/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Support Management</h1>
              <p className="text-gray-600 mt-1">
                Manage and respond to support tickets from all organizations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Support Tickets</CardTitle>
          <CardDescription>
            Manage support tickets from all organizations. Click on a ticket to view details and respond.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets yet</h3>
              <p className="text-gray-500">
                When organizations submit support tickets, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{ticket.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {ticket.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{ticket.organization?.name ?? 'Unknown'}</div>
                          <div className="text-gray-500">{ticket.organization?.subdomain ?? 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${TICKET_CATEGORY_COLORS[ticket.category]} border`}
                        >
                          {TICKET_CATEGORY_LABELS[ticket.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(ticket.status)}
                          <span className="text-sm">{TICKET_STATUS_LABELS[ticket.status]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(ticket.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTicketClick(ticket)}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={handleTicketUpdated}
        />
      )}
    </div>
  );
};
