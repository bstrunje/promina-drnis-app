import React, { useState, useEffect, useCallback } from 'react';
const isDev = import.meta.env.DEV;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Textarea } from '@components/ui/textarea';
import { Label } from '@components/ui/label';
import { Card, CardContent } from '@components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { 
  SupportTicket, 
  TicketResponse,
  TicketStatus, 
  TICKET_CATEGORY_LABELS, 
  TICKET_CATEGORY_COLORS, 
  TICKET_STATUS_LABELS 
} from '@shared/supportTicket';
import { supportTicketApi } from '../../utils/api/supportTicketApi';
import { useToast } from '@components/ui/use-toast';
import { useSystemManager } from '../../context/SystemManagerContext';
import { AlertCircle, CheckCircle, Clock, XCircle, MessageSquare, User } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: SupportTicket;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket: initialTicket,
  isOpen,
  onClose,
  onTicketUpdated
}) => {
  const { toast } = useToast();
  const { manager } = useSystemManager();
  const [ticket, setTicket] = useState<SupportTicket>(initialTicket);
  const [responseText, setResponseText] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);

  // Refresh ticket data from server
  const refreshTicket = useCallback(async () => {
    try {
      const response = await supportTicketApi.getTicketById(initialTicket.id);
      setTicket(response.ticket);
    } catch (error) {
      if (isDev) console.error('Error refreshing ticket:', error);
    }
  }, [initialTicket.id]);

  // Sync local ticket state with prop changes
  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  // Refresh ticket data when modal opens
  useEffect(() => {
    if (isOpen) {
      void refreshTicket();
    }
  }, [isOpen, refreshTicket]);

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case TicketStatus.IN_PROGRESS:
        return <Clock className="h-5 w-5 text-blue-500" />;
      case TicketStatus.RESOLVED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case TicketStatus.CLOSED:
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
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

  const handleAddResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responseText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a response',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmittingResponse(true);
      
      await supportTicketApi.addTicketResponse(ticket.id, {
        response_text: responseText.trim()
      });

      setResponseText('');
      await refreshTicket(); // Refresh ticket data to show new response
      toast({
        title: 'Success',
        description: 'Response added successfully'
      });
    } catch (error) {
      if (isDev) console.error('Error adding response:', error);
      toast({
        title: 'Error',
        description: 'Failed to add response',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    try {
      await supportTicketApi.updateTicket(ticket.id, { status: newStatus });
      await refreshTicket(); // Refresh to show updated status
      toast({
        title: 'Success',
        description: `Ticket status updated to ${TICKET_STATUS_LABELS[newStatus]}`
      });
    } catch (error) {
      if (isDev) console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive'
      });
    }
  };

  const handleCloseTicket = async () => {
    try {
      setIsClosingTicket(true);
      
      await supportTicketApi.closeTicket(ticket.id);
      
      onTicketUpdated();
      onClose();
      toast({
        title: 'Success',
        description: 'Ticket closed successfully'
      });
    } catch (error) {
      if (isDev) console.error('Error closing ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to close ticket',
        variant: 'destructive'
      });
    } finally {
      setIsClosingTicket(false);
    }
  };

  const canAddResponse = ticket.status !== TicketStatus.CLOSED;
  const canCloseTicket = ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.RESOLVED;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getStatusIcon(ticket.status)}
            <span>Support Ticket #{ticket.id}</span>
          </DialogTitle>
          <DialogDescription>
            View and manage support ticket details, responses, and status updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{ticket.title}</h2>
              <div className="flex space-x-2">
                <Badge className={TICKET_CATEGORY_COLORS[ticket.category]}>
                  {TICKET_CATEGORY_LABELS[ticket.category]}
                </Badge>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                {getStatusIcon(ticket.status)}
                {manager?.organization_id === null ? (
                  // GSM can change status
                  <div className="flex items-center space-x-2">
                    <span>Status:</span>
                    <Select value={ticket.status} onValueChange={(value) => void handleStatusUpdate(value as TicketStatus)}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                        <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                        <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  // Org SM sees read-only status
                  <span>Status: {TICKET_STATUS_LABELS[ticket.status]}</span>
                )}
              </div>
              <span>Created: {formatDate(ticket.created_at)}</span>
              {ticket.updated_at !== ticket.created_at && (
                <span>Updated: {formatDate(ticket.updated_at)}</span>
              )}
            </div>
          </div>

          {/* Ticket Description */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900">{ticket.creator?.display_name ?? 'Unknown User'}</span>
                    <span className="text-sm text-gray-500">{formatDate(ticket.created_at)}</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responses */}
          {ticket.responses && ticket.responses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Responses ({ticket.responses.length})</span>
              </h3>
              
              <div className="space-y-3">
                {ticket.responses.map((response: TicketResponse) => (
                  <Card key={response.id} className={response.is_internal ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">
                              {response.creator?.display_name ?? 'Support Team'}{response.is_internal ? ' (Internal)' : ''}
                            </span>
                            <span className="text-sm text-gray-500">{formatDate(response.created_at)}</span>
                            {response.is_internal && (
                              <Badge variant="outline" className="text-xs">Internal</Badge>
                            )}
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {response.response_text || '[No response text available]'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Add Response Form */}
          {canAddResponse && (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={(e) => { void handleAddResponse(e); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="response">Add Response</Label>
                    <Textarea
                      id="response"
                      value={responseText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponseText(e.target.value)}
                      placeholder="Add additional information or ask a question..."
                      rows={4}
                      disabled={isSubmittingResponse}
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      {canCloseTicket && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { void handleCloseTicket(); }}
                          disabled={isClosingTicket}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {isClosingTicket ? 'Closing...' : 'Close Ticket'}
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={isSubmittingResponse || !responseText.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmittingResponse ? 'Adding...' : 'Add Response'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Closed Ticket Message */}
          {ticket.status === TicketStatus.CLOSED && (
            <Card className="border-gray-300 bg-gray-50">
              <CardContent className="p-4 text-center">
                <XCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-600">
                  This ticket has been closed.
                  {ticket.resolved_at && (
                    <span className="block text-sm mt-1">
                      Resolved on {formatDate(ticket.resolved_at)}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
