import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Label } from '@components/ui/label';
import { supportTicketApi } from '../../utils/api/supportTicketApi';
import { TicketCategory, TicketPriority, TICKET_CATEGORY_LABELS } from '@shared/supportTicket';
import { useToast } from '@components/ui/use-toast';

interface SubmitTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export const SubmitTicketModal: React.FC<SubmitTicketModalProps> = ({
  isOpen,
  onClose,
  onTicketCreated
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as TicketCategory | '',
    priority: TicketPriority.MEDIUM
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await supportTicketApi.createTicket({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: TicketPriority.MEDIUM
      });

      onTicketCreated();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create support ticket',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: TicketPriority.MEDIUM
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Submit Support Ticket</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of your issue or request"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as TicketCategory })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketCategory.BUG_REPORT}>
                  🔴 {TICKET_CATEGORY_LABELS[TicketCategory.BUG_REPORT]}
                </SelectItem>
                <SelectItem value={TicketCategory.COMPLAINT}>
                  🟠 {TICKET_CATEGORY_LABELS[TicketCategory.COMPLAINT]}
                </SelectItem>
                <SelectItem value={TicketCategory.FEATURE_REQUEST}>
                  🔵 {TICKET_CATEGORY_LABELS[TicketCategory.FEATURE_REQUEST]}
                </SelectItem>
                <SelectItem value={TicketCategory.GENERAL_SUPPORT}>
                  🟢 {TICKET_CATEGORY_LABELS[TicketCategory.GENERAL_SUPPORT]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please provide detailed information about your issue or request..."
              rows={6}
              required
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              Include steps to reproduce (for bugs), expected behavior, and any relevant details.
            </p>
          </div>

          {/* Category Guidelines */}
          {formData.category && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Guidelines for {TICKET_CATEGORY_LABELS[formData.category]}:
              </h4>
              <div className="text-sm text-gray-600">
                {formData.category === TicketCategory.BUG_REPORT && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Describe what you were trying to do</li>
                    <li>List the steps to reproduce the issue</li>
                    <li>Explain what happened vs. what you expected</li>
                    <li>Include any error messages you saw</li>
                  </ul>
                )}
                {formData.category === TicketCategory.FEATURE_REQUEST && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Describe the feature you'd like to see</li>
                    <li>Explain why this would be useful</li>
                    <li>Provide examples of how it would work</li>
                    <li>Mention any similar features you've seen elsewhere</li>
                  </ul>
                )}
                {formData.category === TicketCategory.COMPLAINT && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Describe the specific issue or concern</li>
                    <li>Explain how it affected you or your work</li>
                    <li>Suggest how it could be improved</li>
                    <li>Be constructive and specific</li>
                  </ul>
                )}
                {formData.category === TicketCategory.GENERAL_SUPPORT && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Clearly state your question or need</li>
                    <li>Provide context about what you're trying to achieve</li>
                    <li>Mention what you've already tried</li>
                    <li>Include relevant details about your setup</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim() || !formData.category}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
