import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Headphones, Plus, MessageSquare, AlertCircle, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { supportTicketApi } from '../../utils/api/supportTicketApi';
import { SupportTicket, TicketStatus, TicketPriority, TICKET_CATEGORY_LABELS, TICKET_CATEGORY_COLORS, TICKET_STATUS_LABELS } from '@shared/supportTicket';
import { SubmitTicketModal } from './SubmitTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
import { useToast } from '@components/ui/use-toast';
import { useSystemManagerNavigation } from './hooks/useSystemManagerNavigation';
import { useSystemManager } from '../../context/SystemManagerContext';

export const OrgSupportPage: React.FC = () => {
  const { toast } = useToast();
  const { navigateTo } = useSystemManagerNavigation();
  const { manager } = useSystemManager();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Org SM može vidjeti samo svoje tickete
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      // Org SM uvijek koristi getMyTickets (samo moji ticketi)
      const response = await supportTicketApi.getMyTickets(1, 20);
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


  useEffect(() => {
    // Provjeri da je stvarno Org SM (organization_id !== null)
    if (manager?.organization_id === null) {
      console.warn('OrgSupportPage: Not an Organization System Manager');
      navigateTo('/system-manager/dashboard');
      return;
    }

    void loadTickets();
  }, [loadTickets, manager?.organization_id, navigateTo]);

  const handleTicketCreated = () => {
    setShowSubmitModal(false);
    void loadTickets();
    toast({
      title: 'Success',
      description: 'Support ticket created successfully',
    });
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdated = () => {
    setSelectedTicket(null);
    void loadTickets();
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
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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
            <Headphones className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Support & Feedback</h1>
              <p className="text-gray-600 mt-1">
                Need help or found an issue? Submit a support ticket and our team will get back to you.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowSubmitModal(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Submit Support Ticket</span>
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Bug Reports</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-red-700">Report system issues</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Complaints</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-orange-700">Report problems</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Feature Requests</CardTitle>
            <Plus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-blue-700">Suggest improvements</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">General Support</CardTitle>
            <Headphones className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-green-700">Get help & guidance</div>
          </CardContent>
        </Card>
      </div>

      {/* My Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>My Tickets</CardTitle>
          <CardDescription>
            {tickets.length === 0 
              ? 'No support tickets submitted yet'
              : `You have ${tickets.length} support ticket${tickets.length === 1 ? '' : 's'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets submitted yet</h3>
              <p className="text-gray-500 mb-6">
                When you submit a support ticket, it will appear here.
              </p>
              <Button onClick={() => setShowSubmitModal(true)} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Submit Your First Ticket</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${TICKET_CATEGORY_COLORS[ticket.category]} border text-xs`}
                        >
                          {TICKET_CATEGORY_LABELS[ticket.category]}
                        </Badge>
                        <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} text-xs`}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {formatDate(ticket.created_at)}</span>
                        <span>Status: {TICKET_STATUS_LABELS[ticket.status]}</span>
                        <span>Responses: {ticket.responses?.length ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Ticket Modal */}
      {showSubmitModal && (
        <SubmitTicketModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onTicketCreated={handleTicketCreated}
        />
      )}

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
