import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { User, ChevronDown, ChevronRight } from "lucide-react";
import { Member } from "@shared/member";
import { getMembershipDisplayLabel } from "@shared/helpers/membershipDisplay";
import { MembershipTypeEnum } from "@shared/member";
import { formatDate, formatInputDate } from "../src/utils/dateUtils";
import { useAuth } from "../src/context/AuthContext";

interface MemberBasicInfoProps {
  member: Member;
  isEditing: boolean;
  editedMember: Member | null | undefined;
  handleChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  validationErrors?: Record<string, string>;
}

const MemberBasicInfo: React.FC<MemberBasicInfoProps> = ({
  member,
  isEditing,
  editedMember,
  handleChange,
  validationErrors,
}) => {
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  // Determine if the user can view details
  // Admins, superusers, and the member viewing their own profile should always see details
  const isOwnProfile = user?.member_id === member.member_id;
  const isAdminOrSuperuser = user?.role === "admin" || user?.role === "superuser";
  const canViewDetails = isOwnProfile || isAdminOrSuperuser;

  // Automatically show details if user has edit permission
  useEffect(() => {
    if (isEditing) {
      setShowDetails(true);
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <Card>
        <CardHeader 
          className={canViewDetails ? "cursor-pointer hover:bg-gray-50" : ""} 
          onClick={() => canViewDetails && setShowDetails(!showDetails)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </div>
            {canViewDetails && (
              showDetails ? 
                <ChevronDown className="h-5 w-5" /> : 
                <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canViewDetails && showDetails ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Full Name</label>
                <p>
                  {member.first_name} {member.last_name}{member.nickname ? ` - ${member.nickname}` : ''}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date of Birth</label>
                <p>
                  {formatDate(member?.date_of_birth)}
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
          ) : canViewDetails ? (
            <p className="text-sm text-gray-500 italic">Click the header to view personal information</p>
          ) : (
            <p className="text-sm text-gray-500 italic">Personal information is private</p>
          )}
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
            {validationErrors?.first_name && (
              <p className="text-sm text-red-500">{validationErrors.first_name}</p>
            )}
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
            {validationErrors?.last_name && (
              <p className="text-sm text-red-500">{validationErrors.last_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nadimak (opcionalno)</label>
            <input
              type="text"
              name="nickname"
              value={editedMember?.nickname || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Unesite nadimak člana"
            />
            <p className="text-xs text-gray-500 mt-1">
              
            </p>
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
                  ? formatInputDate(editedMember.date_of_birth)
                  : ""
              }
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.date_of_birth && (
              <p className="text-sm text-red-500">{validationErrors.date_of_birth}</p>
            )}
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
            {validationErrors?.gender && (
              <p className="text-sm text-red-500">{validationErrors.gender}</p>
            )}
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
            {validationErrors?.oib && (
              <p className="text-sm text-red-500">{validationErrors.oib}</p>
            )}
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
            {validationErrors?.email && (
              <p className="text-sm text-red-500">{validationErrors.email}</p>
            )}
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
            {validationErrors?.cell_phone && (
              <p className="text-sm text-red-500">{validationErrors.cell_phone}</p>
            )}
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
            {validationErrors?.street_address && (
              <p className="text-sm text-red-500">{validationErrors.street_address}</p>
            )}
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
            {validationErrors?.city && (
              <p className="text-sm text-red-500">{validationErrors.city}</p>
            )}
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
            {validationErrors?.life_status && (
              <p className="text-sm text-red-500">{validationErrors.life_status}</p>
            )}
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
            {validationErrors?.membership_type && (
              <p className="text-sm text-red-500">{validationErrors.membership_type}</p>
            )}
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
            {validationErrors?.tshirt_size && (
              <p className="text-sm text-red-500">{validationErrors.tshirt_size}</p>
            )}
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
            {validationErrors?.shell_jacket_size && (
              <p className="text-sm text-red-500">{validationErrors.shell_jacket_size}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberBasicInfo;
