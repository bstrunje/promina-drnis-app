import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Package, CheckCircle, XCircle, Gift } from "lucide-react";
import { Member } from "@shared/member";
import { useAuth } from "../src/context/useAuth";
import { useToast } from "@components/ui/use-toast";
import api from "../src/utils/api/apiConfig";

interface EquipmentSectionProps {
  member: Member;
  onUpdate: () => void;
}

interface EquipmentStatus {
  member_id: number;
  tshirt: {
    size: string;
    delivered: boolean;
  };
  shell_jacket: {
    size: string;
    delivered: boolean;
  };
  hat: {
    size: string;
    delivered: boolean;
  };
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({
  member,
  onUpdate,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('dashboards');
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus | null>(null);

  // Check if user can manage equipment - only admins and superusers
  const canManageEquipment = user?.role === "member_administrator" || user?.role === "member_superuser";
  const canUndeliver = user?.role === "member_superuser";

  // Load equipment status
  const loadEquipmentStatus = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/members/${member.member_id}/equipment/status`);
      setEquipmentStatus(response.data);
    } catch (error) {
      console.error('Error loading equipment status:', error);
      toast({
        title: "Error",
        description: "Failed to load equipment status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mark equipment as delivered
  const markAsDelivered = async (equipmentType: string) => {
    try {
      setIsLoading(true);
      await api.post(`/members/${member.member_id}/equipment/${equipmentType}/deliver`);
      
      toast({
        title: "Success",
        description: `${equipmentType} marked as delivered`,
        variant: "default",
      });
      
      await loadEquipmentStatus();
      onUpdate();
    } catch (error: any) {
      console.error('Error marking equipment as delivered:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to mark ${equipmentType} as delivered`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mark equipment as undelivered (SuperUser only)
  const markAsUndelivered = async (equipmentType: string) => {
    try {
      setIsLoading(true);
      await api.post(`/members/${member.member_id}/equipment/${equipmentType}/undeliver`);
      
      toast({
        title: "Success",
        description: `${equipmentType} marked as undelivered`,
        variant: "default",
      });
      
      await loadEquipmentStatus();
      onUpdate();
    } catch (error: any) {
      console.error('Error marking equipment as undelivered:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to mark ${equipmentType} as undelivered`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load equipment status on component mount
  React.useEffect(() => {
    if (canManageEquipment) {
      loadEquipmentStatus();
    }
  }, [member.member_id, canManageEquipment]);

  if (!canManageEquipment) {
    return null; // Don't show equipment section for regular members
  }

  const equipmentItems = [
    {
      type: 'tshirt',
      name: 'T-Shirt',
      size: member.tshirt_size,
      delivered: member.tshirt_delivered || false,
    },
    {
      type: 'shell_jacket',
      name: 'Shell Jacket',
      size: member.shell_jacket_size,
      delivered: member.shell_jacket_delivered || false,
    },
    {
      type: 'hat',
      name: 'Hat',
      size: member.hat_size,
      delivered: member.hat_delivered || false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Equipment Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading equipment status...</div>
        ) : (
          <div className="space-y-4">
            {equipmentItems.map((item) => (
              <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {item.delivered ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      Size: {item.size || 'Not set'}
                    </div>
                    <div className="text-sm">
                      Status: {item.delivered ? (
                        <span className="text-green-600 font-medium">Delivered</span>
                      ) : (
                        <span className="text-red-600 font-medium">Not delivered</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {!item.delivered ? (
                    <Button
                      onClick={() => markAsDelivered(item.type)}
                      disabled={isLoading || !item.size}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Mark Delivered
                    </Button>
                  ) : canUndeliver ? (
                    <Button
                      onClick={() => markAsUndelivered(item.type)}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Undeliver
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            
            {equipmentItems.some(item => !item.size) && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <strong>Note:</strong> Equipment sizes must be set before delivery can be marked.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentSection;
