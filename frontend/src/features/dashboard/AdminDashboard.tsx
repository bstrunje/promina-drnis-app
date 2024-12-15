// frontend/src/features/dashboard/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity } from "lucide-react";
import { Member } from "@shared/types/member";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";

interface Props {
  member: Member;
}

interface InventoryData {
  stamp_type: 'employed' | 'student' | 'pensioner';
  initial_count: number;
  issued_count: number;
  remaining: number;
}

interface StampInventory {
  employedStamps: {
    initial: number;
    issued: number;
    remaining: number;
  };
  studentStamps: {
    initial: number;
    issued: number;
    remaining: number;
  };
  pensionerStamps: {
    initial: number;
    issued: number;
    remaining: number;
  };
}

const AdminDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [inventory, setInventory] = useState<StampInventory>({
    employedStamps: { initial: 0, issued: 0, remaining: 0 },
    studentStamps: { initial: 0, issued: 0, remaining: 0 },
    pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
  });
  const [editValues, setEditValues] = useState(inventory);

  // Add this after your state declarations
useEffect(() => {
  fetchInventory();
}, []);

const fetchInventory = async () => {
  try {
      const response = await fetch('/api/stamps/inventory', {
          headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      
      const data = await response.json() as InventoryData[];
      setInventory({
          employedStamps: {
              initial: data.find((i: InventoryData) => i.stamp_type === 'employed')?.initial_count || 0,
              issued: data.find((i: InventoryData) => i.stamp_type === 'employed')?.issued_count || 0,
              remaining: data.find((i: InventoryData) => i.stamp_type === 'employed')?.remaining || 0
          },
          studentStamps: {
              initial: data.find((i: InventoryData) => i.stamp_type === 'student')?.initial_count || 0,
              issued: data.find((i: InventoryData) => i.stamp_type === 'student')?.issued_count || 0,
              remaining: data.find((i: InventoryData) => i.stamp_type === 'student')?.remaining || 0
          },
          pensionerStamps: {
              initial: data.find((i: InventoryData) => i.stamp_type === 'pensioner')?.initial_count || 0,
              issued: data.find((i: InventoryData) => i.stamp_type === 'pensioner')?.issued_count || 0,
              remaining: data.find((i: InventoryData) => i.stamp_type === 'pensioner')?.remaining || 0
          }
      });
  } catch (error) {
      toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to fetch inventory',
          variant: "destructive"
      });
  }
};
  const handleEdit = () => {
    setEditValues(inventory);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValues(inventory);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/admin/stamp-inventory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          employed: editValues.employedStamps.initial,
          student: editValues.studentStamps.initial,
          pensioner: editValues.pensionerStamps.initial,
        }),
      });

      if (!response.ok) throw new Error("Failed to update inventory");

      setInventory(editValues);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Stamp inventory updated successfully",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update inventory",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (type: keyof StampInventory, value: number) => {
    setEditValues((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        initial: value,
        remaining: value - prev[type].issued,
      },
    }));
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
        <p className="opacity-90">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate("/members")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Member Management</h3>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">
            Manage member accounts and permissions
          </p>
        </div>

        <div
          onClick={() => navigate("/activities")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Activity Management</h3>
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">Manage and monitor activities</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stamp Inventory</CardTitle>
          {!isEditing ? (
            <Button variant="outline" onClick={handleEdit}>
              Edit Inventory
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Employed/Unemployed Stamps */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">
                Employed/Unemployed Stamps
              </h3>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="text-sm text-blue-600">Initial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={inventory.employedStamps.issued}
                      value={editValues.employedStamps.initial}
                      onChange={(e) =>
                        handleInputChange(
                          "employedStamps",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full mt-1 p-1 border rounded"
                    />
                  ) : (
                    <p className="font-bold text-blue-700">
                      {inventory.employedStamps.initial}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-blue-600">Issued</label>
                  <p className="font-bold text-blue-700">
                    {inventory.employedStamps.issued}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-blue-600">Remaining</label>
                  <p className="font-bold text-blue-700">
                    {inventory.employedStamps.remaining}
                  </p>
                </div>
              </div>
            </div>

            {/* Student/Pupil Stamps */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800">
                Student/Pupil Stamps
              </h3>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="text-sm text-green-600">Initial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={inventory.studentStamps.issued}
                      value={editValues.studentStamps.initial}
                      onChange={(e) =>
                        handleInputChange(
                          "studentStamps",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full mt-1 p-1 border rounded"
                    />
                  ) : (
                    <p className="font-bold text-green-700">
                      {inventory.studentStamps.initial}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-green-600">Issued</label>
                  <p className="font-bold text-green-700">
                    {inventory.studentStamps.issued}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-green-600">Remaining</label>
                  <p className="font-bold text-green-700">
                    {inventory.studentStamps.remaining}
                  </p>
                </div>
              </div>
            </div>

            {/* Pensioner Stamps */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800">Pensioner Stamps</h3>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="text-sm text-red-600">Initial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={inventory.pensionerStamps.issued}
                      value={editValues.pensionerStamps.initial}
                      onChange={(e) =>
                        handleInputChange(
                          "pensionerStamps",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full mt-1 p-1 border rounded"
                    />
                  ) : (
                    <p className="font-bold text-red-700">
                      {inventory.pensionerStamps.initial}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-red-600">Issued</label>
                  <p className="font-bold text-red-700">
                    {inventory.pensionerStamps.issued}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-red-600">Remaining</label>
                  <p className="font-bold text-red-700">
                    {inventory.pensionerStamps.remaining}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
