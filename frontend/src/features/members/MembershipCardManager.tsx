import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { AlertCircle, Stamp } from "lucide-react";
import { Member } from "@shared/types/member";

interface Props {
  member: Member;
  onUpdate: () => void;
}

const MembershipCardManager: React.FC<Props> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCardNumberAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/members/${member.member_id}/card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cardNumber })
      });

      if (!response.ok) throw new Error('Failed to assign card number');

      toast({
        title: "Success",
        description: "Card number assigned successfully",
        variant: "success"
      });
      
      onUpdate();
      setCardNumber('');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to assign card number',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStampIssue = async () => {
    try {
      const response = await fetch(`/api/members/${member.member_id}/stamp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to issue stamp');

      toast({
        title: "Success",
        description: "Stamp issued successfully",
        variant: "success"
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to issue stamp',
        variant: "destructive"
      });
    }
  };

  const getStatusColor = () => {
    switch (member.life_status) {
      case 'employed/unemployed':
        return 'bg-blue-600';
      case 'child/pupil/student':
        return 'bg-green-600';
      case 'pensioner':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Membership Card Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Card Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Current Status</h4>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Card Number:</span>
              {member.membership_details?.card_number ? (
                <span className={`ml-2 px-3 py-1 rounded text-white ${getStatusColor()}`}>
                  {member.membership_details.card_number}
                </span>
              ) : (
                <span className="ml-2 text-gray-400">Not assigned</span>
              )}
            </div>
            <div>
              <span className="text-sm text-gray-500">Stamp Status:</span>
              <span className="ml-2">
                {member.membership_details?.card_stamp_issued ? (
                  <span className="text-green-600">Issued</span>
                ) : (
                  <span className="text-yellow-600">Not issued</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card Number Assignment Form */}
        {!member.membership_details?.card_number && (
          <form onSubmit={handleCardNumberAssign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Assign Card Number
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="flex-1 rounded-md border px-3 py-2"
                  placeholder="Enter card number"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  Assign
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Stamp Issuance */}
        {member.membership_details?.card_number && !member.membership_details?.card_stamp_issued && (
          <div className="mt-4">
            <Button 
              onClick={handleStampIssue}
              className="w-full"
              variant="outline"
            >
              <Stamp className="w-4 h-4 mr-2" />
              Issue Stamp
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipCardManager;