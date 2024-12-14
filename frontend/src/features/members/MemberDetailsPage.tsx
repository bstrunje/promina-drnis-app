import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import { Edit, Save, X } from "lucide-react";
import { API_URL } from "../../utils/config";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ActivityHistory from './ActivityHistory';

// Types we need
interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  cell_phone: string;
  street_address: string;
  city: string;
  life_status: "employed/unemployed" | "child/pupil/student" | "pensioner";
  membership_type: "regular" | "supporting" | "honorary";
  tshirt_size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
  shell_jacket_size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
  total_hours?: number;
  profile_image?: string;
}

interface Props {
  memberId?: number;
  currentUser?: {
    role: string;
    member_id: number;
  };
  onUpdate?: (member: Member) => void;
}

interface MembershipFormData {
  fee_payment_date: string;
  card_number: string;
  card_stamp_issued: boolean;
  fee_payment_year: number;
}

const MemberDetailsPage: React.FC<Props> = ({ onUpdate }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const memberId = parseInt(id || "0");
  const [member, setMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [comment, setComment] = useState('');

  const canEdit = user?.role === "admin" || user?.role === "superuser";
  const isOwnProfile = user?.member_id === memberId;

  const [membershipData, setMembershipData] = useState<MembershipFormData>({
    fee_payment_date: '',
    card_number: '',
    card_stamp_issued: false,
    fee_payment_year: new Date().getFullYear()
  });

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        // If no id in URL, use the current user's id
        const memberId = id || user?.member_id;
        if (!memberId) {
          setError('No member ID available');
          return;
        }
  
        const response = await fetch(`${API_URL}/members/${memberId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
  
        if (!response.ok) throw new Error("Failed to fetch member details");
        const data = await response.json();
        setMember(data);
        setEditedMember(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching member details");
      }
    };
  
    fetchMemberDetails();
  }, [id, user]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMember(member);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedMember(member);
    setError(null);
  };

  const handleSave = async () => {
    if (!editedMember) return;

    try {
      const response = await fetch(
        `${API_URL}/members/${editedMember.member_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(editedMember),
        }
      );

      if (!response.ok) throw new Error("Failed to update member");

      const updatedMember = await response.json();
      setMember(updatedMember);
      setIsEditing(false);
      setError(null);
      if (onUpdate) {
        onUpdate(updatedMember);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating member");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editedMember) return;

    const { name, value } = e.target;
    setEditedMember((prev) =>
      prev
        ? {
            ...prev,
            [name]: value,
          }
        : null
    );
  };

  const sendMemberMessage = async (memberId: number, message: string) => {
    try {
      const response = await fetch(`${API_URL}/members/${memberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageText: message })
      });
      if (!response.ok) throw new Error('Failed to send message');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const navigate = useNavigate();

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user?.member_id) {
        setError('User not found');
        return;
      }
      await sendMemberMessage(user.member_id, comment);
      setComment(''); // Clear form after success
      // Optional: Show success message
    } catch (error) {
      console.error('Error sending message:', error);
      // Optional: Show error message
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || !files[0] || !member) return;

    try {
      setIsUploading(true);
      setError(null);
      setImageFile(files[0]);

      const formData = new FormData();
      formData.append("image", files[0]);

      const response = await fetch(
        `${API_URL}/members/${member.member_id}/profile-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Failed to upload image");

      const data = await response.json();
      setMember((prev) =>
        prev ? { ...prev, profile_image: data.imagePath } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading image");
    } finally {
      setIsUploading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate('/members')}
          className="mt-4 bg-gray-500 hover:bg-gray-600"
        >
          Back to Member List
        </Button>
      </div>
    );
  }
  
  if (!member) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  const handleMembershipUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/members/${memberId}/membership`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fee_payment_date: membershipData.fee_payment_date,
          card_number: membershipData.card_number,
          card_stamp_issued: membershipData.card_stamp_issued,
          fee_payment_year: membershipData.fee_payment_year
        })
      });
  
      if (!response.ok) throw new Error('Failed to update membership');
      // Add success notification or refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update membership');
    }
  };
  
  const handleTermination = async (reason: string) => {
    if (!reason) return;
    try {
      const response = await fetch(`${API_URL}/members/${memberId}/membership/terminate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          end_date: new Date().toISOString()
        })
      });
  
      if (!response.ok) throw new Error('Failed to terminate membership');
      // Add success notification
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to terminate membership');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-2">Member Profile</h1>
          {canEdit && !isOwnProfile && (
            <div>
              {isEditing ? (
                <div className="space-x-2">
                  <Button
                    onClick={handleSave}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={() => navigate("/members")}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    Back to List
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={editedMember?.first_name || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={editedMember?.last_name || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editedMember?.email || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="cell_phone"
                      value={editedMember?.cell_phone || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="street_address"
                      value={editedMember?.street_address || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={editedMember?.city || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Life Status
                    </label>
                    <select
                      name="life_status"
                      value={editedMember?.life_status || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="employed/unemployed">
                        Employed/Unemployed
                      </option>
                      <option value="child/pupil/student">
                        Child/Pupil/Student
                      </option>
                      <option value="pensioner">Pensioner</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-gray-500">Full Name</label>
                    <p>
                      {member.first_name} {member.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p>{member.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <p>{member.cell_phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Address</label>
                    <p>{member.street_address}</p>
                    <p>{member.city}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Life Status</label>
                    <p>{member.life_status}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden">
                {imageFile ? (
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="image-upload"
                className={`px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 ${
                  isUploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUploading ? "Uploading..." : "Upload New Image"}
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Total Hours</label>
                <p className="text-2xl font-bold">{member.total_hours || 0}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p
                  className={`font-medium ${
                    (member.total_hours || 0) >= 20
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {(member.total_hours || 0) >= 20 ? "Active" : "Passive"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership Details1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Membership Type
                    </label>
                    <select
                      name="membership_type"
                      value={editedMember?.membership_type || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="regular">Regular</option>
                      <option value="supporting">Supporting</option>
                      <option value="honorary">Honorary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      T-Shirt Size
                    </label>
                    <select
                      name="tshirt_size"
                      value={editedMember?.tshirt_size || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Shell Jacket Size
                    </label>
                    <select
                      name="shell_jacket_size"
                      value={editedMember?.shell_jacket_size || ""}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-gray-500">
                      Membership Type
                    </label>
                    <p>{member.membership_type}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">
                      T-Shirt Size
                    </label>
                    <p>{member.tshirt_size}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">
                      Shell Jacket Size
                    </label>
                    <p>{member.shell_jacket_size}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
  <CardHeader>
    <CardTitle>Membership Details2</CardTitle>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleMembershipUpdate} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Fee Payment Date</label>
        <input
          type="date"
          value={membershipData.fee_payment_date}
          onChange={(e) => setMembershipData(prev => ({
            ...prev,
            fee_payment_date: e.target.value
          }))}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Fee Payment Year</label>
        <input
          type="number"
          value={membershipData.fee_payment_year}
          onChange={(e) => setMembershipData(prev => ({
            ...prev,
            fee_payment_year: parseInt(e.target.value)
          }))}
          className="w-full p-2 border rounded"
          min={2000}
          max={2100}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Card Number</label>
        <input
          type="text"
          value={membershipData.card_number}
          onChange={(e) => setMembershipData(prev => ({
            ...prev,
            card_number: e.target.value
          }))}
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={membershipData.card_stamp_issued}
          onChange={(e) => setMembershipData(prev => ({
            ...prev,
            card_stamp_issued: e.target.checked
          }))}
          className="mr-2"
        />
        <label className="text-sm font-medium">Card Stamp Issued</label>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Update Membership
      </button>
    </form>
  </CardContent>
</Card>

{/* Membership Fee Payment Section */}
<Card>
  <CardHeader>
    <CardTitle>Membership Fee Payment</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Payment Confirmation Date</label>
        <input
          type="date"
          value={membershipData.fee_payment_date}
          onChange={(e) => {
            const paymentDate = new Date(e.target.value);
            const startYear = paymentDate.getMonth() >= 10 ? 
              paymentDate.getFullYear() + 1 : 
              paymentDate.getFullYear();
            
            setMembershipData(prev => ({
              ...prev,
              fee_payment_date: e.target.value,
              fee_payment_year: startYear
            }));
          }}
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="text-sm text-gray-600">
        {membershipData.fee_payment_date && (
          <p>
            Membership will {new Date(membershipData.fee_payment_date).getMonth() >= 10 ? 
              'start on January 1st, ' + (new Date(membershipData.fee_payment_date).getFullYear() + 1) :
              'be active for current year'
            }
          </p>
        )}
      </div>
    </div>
  </CardContent>
</Card>

{(user?.role === 'admin' || user?.role === 'superuser') && (
  <Card>
    <CardHeader>
      <CardTitle>Membership Termination</CardTitle>
    </CardHeader>
    <CardContent>
      <select 
        className="w-full p-2 border rounded mb-4"
        onChange={(e) => handleTermination(e.target.value)}
      >
        <option value="">Select Reason</option>
        <option value="withdrawal">Personal Withdrawal</option>
        <option value="non_payment">Non Payment</option>
        <option value="expulsion">Expulsion</option>
        <option value="death">Death</option>
      </select>
    </CardContent>
  </Card>
)} 

  {/* Message Section */}
<Card>
  <CardHeader>
    <CardTitle>Send Message to Admin</CardTitle>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleCommentSubmit}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full p-2 border rounded-md mb-4"
        rows={4}
        placeholder="Type your message here..."
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Send Message
      </button>
    </form>
  </CardContent>
</Card>

{/* Activity History Section */}
{user?.member_id && <ActivityHistory memberId={user.member_id} />}

<Card>
  <CardHeader>
    <CardTitle>Activity History</CardTitle>
  </CardHeader>
  <CardContent>
    {/* TODO: Add activity history component */}
  </CardContent>
</Card>
      </div>
    </div>
  );
};

export default MemberDetailsPage;
