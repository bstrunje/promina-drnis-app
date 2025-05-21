import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { AdminPermissionsModel as AdminPermissions } from '@shared/systemAdmin';
import { Member } from '@shared/member';
import { useToast } from '@components/ui/use-toast';
import api from '../src/utils/api';

interface Props {
  admin: Member;
}

export const AdminPermissionsManager: React.FC<Props> = ({ admin }) => {
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [isChanged, setIsChanged] = useState(false);
  const { toast } = useToast();

  const fetchPermissions = React.useCallback(async () => {
    try {
      console.log('Fetching permissions for admin:', admin.member_id);
      const response = await api.get(`/admin/permissions/${admin.member_id}`);
      console.log('Raw API Response:', response);
      console.log('Permissions data:', response.data);
      setPermissions(response.data as AdminPermissions);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive"
      });
    }
  }, [admin.member_id, toast]);

  useEffect(() => {
    void fetchPermissions();
  }, [admin.member_id, fetchPermissions]);

  const handlePermissionChange = () => {
    if (!permissions) return;
    try {
      const newPermissions = {
        ...permissions,
        can_manage_end_reasons: !permissions.can_manage_end_reasons
      };

      console.log('Changing permissions from:', permissions);
      console.log('to:', newPermissions);
      setPermissions(newPermissions);
      setIsChanged(true);
    } catch (error) {
      console.error('Error changing permissions:', error);
      toast({
        title: "Error",
        description: "Failed to change permissions",
        variant: "destructive"
      });
    }
  };


  const handleSave = async () => {
    try {
      await api.put(`/admin/permissions/${admin.member_id}`, {
        permissions: {
          can_manage_end_reasons: permissions?.can_manage_end_reasons
        }
      });

      // Osvježavamo stanje nakon uspješnog spremanja
      await fetchPermissions();
      setIsChanged(false);
      
      toast({
        title: "Success",
        description: "Permissions updated successfully"
      });
    } catch (error) {
      console.error('Failed to save permissions:', error);
      // Vratimo staro stanje ako je došlo do greške
      await fetchPermissions();
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Permissions - {admin.full_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="font-medium">Can manage membership end reasons</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {permissions?.can_manage_end_reasons ? 'Enabled' : 'Disabled'}
              </span>
              <SwitchPrimitive.Root
                checked={permissions?.can_manage_end_reasons ?? false}
                onCheckedChange={handlePermissionChange}
                className="peer inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <SwitchPrimitive.Thumb 
                  className="pointer-events-none block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0" 
                />
              </SwitchPrimitive.Root>
            </div>
          </div>
          
          {isChanged && (
            <div className="flex justify-end mt-4 border-t pt-4">
              <button
                onClick={() => void handleSave()}
                className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors font-semibold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
