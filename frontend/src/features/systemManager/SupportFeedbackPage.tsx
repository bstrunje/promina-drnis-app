import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Headphones, Plus, MessageSquare, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supportTicketApi } from '../../utils/api/supportTicketApi';
import { SupportTicket, TicketStatus, TicketPriority, TICKET_CATEGORY_LABELS, TICKET_CATEGORY_COLORS, TICKET_STATUS_LABELS } from '@shared/supportTicket';
import { SubmitTicketModal } from './SubmitTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
import { useToast } from '@components/ui/use-toast';

export const SupportFeedbackPage: React.FC = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [stats, setStats] = useState({ // eslint-disable-line @typescript-eslint/no-unused-vars
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  });

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
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

  const loadStats = async () => {
    try {
      const response = await supportTicketApi.getTicketStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    void loadTickets();
    void loadStats();
  }, [loadTickets]);

  const handleTicketCreated = () => {
    setShowSubmitModal(false);
    void loadTickets();
    void loadStats();
    toast({
      title: 'Success',
      description: 'Support ticket submitted successfully'
    });
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case TicketStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4 text-blue-500" />;
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
        return 'bg-red-100 text-red-800';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TicketPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case TicketPriority.LOW:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Headphones className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support & Feedback</h1>
            <p className="text-gray-600 mt-1">
              Need help or found an issue? Submit a support ticket and our team will get back to you.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setShowSubmitModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Submit Support Ticket
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-red-800">Bug Reports</h3>
            <p className="text-sm text-red-600 mt-1">Report system issues</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-orange-800">Complaints</h3>
            <p className="text-sm text-orange-600 mt-1">Report problems</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-800">Feature Requests</h3>
            <p className="text-sm text-blue-600 mt-1">Suggest improvements</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Headphones className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-800">General Support</h3>
            <p className="text-sm text-green-600 mt-1">Get help & guidance</p>
          </CardContent>
        </Card>
      </div>

      {/* My Tickets Section */}
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
            <div className="text-center py-8">
              <Headphones className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets submitted yet</h3>
              <p className="text-gray-500 mb-4">
                When you submit a support ticket, it will appear here.
              </p>
              <Button 
                onClick={() => setShowSubmitModal(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                        <Badge className={TICKET_CATEGORY_COLORS[ticket.category]}>
                          {TICKET_CATEGORY_LABELS[ticket.category]}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {formatDate(ticket.created_at)}</span>
                        <span>Status: {TICKET_STATUS_LABELS[ticket.status]}</span>
                        {ticket.responses && ticket.responses.length > 0 && (
                          <span>Responses: {ticket.responses.length}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showSubmitModal && (
        <SubmitTicketModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onTicketCreated={handleTicketCreated}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={() => { void loadTickets(); }}
        />
      )}
    </div>
  );
};
