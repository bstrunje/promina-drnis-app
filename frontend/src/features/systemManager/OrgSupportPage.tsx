import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Headphones, Plus, MessageSquare, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supportTicketApi } from '../../utils/api/supportTicketApi';
import { SupportTicket, TicketStatus, TicketPriority, TICKET_CATEGORY_LABELS, TICKET_CATEGORY_COLORS, TICKET_STATUS_LABELS, TicketCategory } from '@shared/supportTicket';
import { SubmitTicketModal } from './SubmitTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
import { useToast } from '@components/ui/use-toast';
import { useSystemManagerNavigation } from './hooks/useSystemManagerNavigation';
import { useSystemManager } from '../../context/SystemManagerContext';
import ManagerHeader from './components/common/ManagerHeader';
import ManagerTabNav from './components/common/ManagerTabNav';

export const OrgSupportPage: React.FC = () => {
  const { toast } = useToast();
  const { navigateTo } = useSystemManagerNavigation();
  const { manager } = useSystemManager();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | undefined>(undefined);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <ManagerHeader 
        manager={manager} 
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
      />

      {/* Navigation */}
      <ManagerTabNav 
        activeTab="support" 
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

      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        {/* Title section */}
        <div className="mb-6 sm:mb-8">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Support & Feedback</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                Need help or found an issue? Submit a support ticket and our team will get back to you.
              </p>
            </div>
            <Button 
              onClick={() => {
                setSelectedCategory(undefined);
                setShowSubmitModal(true);
              }} 
              className="w-full sm:w-auto flex items-center justify-center space-x-2 mt-4 sm:mt-0"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Ticket</span>
            </Button>
          </div>
        </div>

      {/* Category Cards - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        <Card 
          className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSelectedCategory(TicketCategory.BUG_REPORT);
            setShowSubmitModal(true);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-sm font-semibold text-red-800 mb-1">Bug Reports</CardTitle>
                <p className="text-xs sm:text-xs text-red-700">Report system issues</p>
              </div>
              <AlertCircle className="h-5 w-5 sm:h-4 sm:w-4 text-red-600 flex-shrink-0 ml-2" />
            </div>
          </CardHeader>
        </Card>

        <Card 
          className="border-orange-200 bg-orange-50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSelectedCategory(TicketCategory.COMPLAINT);
            setShowSubmitModal(true);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-sm font-semibold text-orange-800 mb-1">Complaints</CardTitle>
                <p className="text-xs sm:text-xs text-orange-700">Report problems</p>
              </div>
              <MessageSquare className="h-5 w-5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0 ml-2" />
            </div>
          </CardHeader>
        </Card>

        <Card 
          className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSelectedCategory(TicketCategory.FEATURE_REQUEST);
            setShowSubmitModal(true);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-sm font-semibold text-blue-800 mb-1">Feature Requests</CardTitle>
                <p className="text-xs sm:text-xs text-blue-700">Suggest improvements</p>
              </div>
              <Plus className="h-5 w-5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardHeader>
        </Card>

        <Card 
          className="border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSelectedCategory(TicketCategory.GENERAL_SUPPORT);
            setShowSubmitModal(true);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-sm font-semibold text-green-800 mb-1">General Support</CardTitle>
                <p className="text-xs sm:text-xs text-green-700">Get help & guidance</p>
              </div>
              <Headphones className="h-5 w-5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardHeader>
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
      </div>

      {/* Submit Ticket Modal */}
      {showSubmitModal && (
        <SubmitTicketModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onTicketCreated={handleTicketCreated}
          defaultCategory={selectedCategory}
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
