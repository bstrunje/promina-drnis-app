import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { User } from "lucide-react";
import { Member } from "@shared/member";

interface MemberBasicInfoProps {
  member: Member;
  isEditing: boolean;
  editedMember: Member | null | undefined; // Update this line
  handleChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

const MemberBasicInfo: React.FC<MemberBasicInfoProps> = ({
  member,
  isEditing,
  editedMember,
  handleChange,
}) => {
  if (!isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Full Name</label>
              <p>
                {member.first_name} {member.last_name}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Date of Birth</label>
              <p>
                {member?.date_of_birth
                  ? new Date(member.date_of_birth).toLocaleDateString()
                  : ""}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Gender</label>
              <p className="capitalize">{member?.gender}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">OIB</label>
              <p>{member?.oib}</p>
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
            <div>
              <label className="text-sm text-gray-500">T-Shirt Size</label>
              <p>{member?.tshirt_size || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Shell Jacket Size</label>
              <p>{member?.shell_jacket_size || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <User className="h-5 w-5" />
          Edit Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={editedMember?.first_name || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
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
              Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={
                editedMember?.date_of_birth
                  ? editedMember.date_of_birth.split("T")[0]
                  : ""
              }
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <select
              name="gender"
              value={editedMember?.gender || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OIB</label>
            <input
              type="text"
              name="oib"
              value={editedMember?.oib || ""}
              onChange={handleChange}
              pattern="[0-9]{11}"
              title="OIB must be exactly 11 digits"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={editedMember?.email || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
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
            <label className="block text-sm font-medium mb-1">City</label>
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
              <option value="employed/unemployed">Employed/Unemployed</option>
              <option value="child/pupil/student">Child/Pupil/Student</option>
              <option value="pensioner">Pensioner</option>
            </select>
          </div>

          {/* Add membership type dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Membership Type
            </label>
            <select
              name="membership_type"
              value={editedMember?.membership_type || "regular"}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="regular">Regular Member</option>
              <option value="supporting">Supporting Member</option>
              <option value="honorary">Honorary Member</option>
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
              <option value="XXXL">XXXL</option>
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
              <option value="XXXL">XXXL</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberBasicInfo;
