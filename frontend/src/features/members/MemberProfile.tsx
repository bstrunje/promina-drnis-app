// frontend/src/features/members/MemberProfile.tsx
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Clock, Calendar, Award, User, Clipboard } from "lucide-react";
import { membershipTypeLabels } from "@shared/helpers/membershipDisplay";
import { MembershipPeriod, MembershipHistory } from "@shared/membership";
import { Member, MembershipTypeEnum } from "@shared/member";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
// Zamijenjeno prema novoj modularnoj API strukturi
import api from '../../utils/api/apiConfig';
import MembershipCardManagerAdapter from '../../features/membership/MembershipCardManagerAdapter';

import { formatDate } from "../../utils/dateUtils";
import { getCurrentDate } from '../../utils/dateUtils';
import { IMAGE_BASE_URL } from "@/utils/config";

declare module "@shared/member" {
  interface Member {
    membership_history?: MembershipHistory;
  }
}

// Type guard za Member tip
function isMember(obj: unknown): obj is Member {
  if (!obj || typeof obj !== 'object') return false;
  const m = obj as Partial<Member>;
  return typeof m.member_id === 'number' && typeof m.first_name === 'string' && typeof m.last_name === 'string';
}

const MemberProfile = () => {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const memberId = user?.member_id;

// Placeholder SVG as data URI - a simple user icon
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXVzZXIiPjxwYXRoIGQ9Ik0xOSAyMXYtMmE0IDQgMCAwIDAtNC00SDlhNCA0IDAgMCAwLTQgNHYyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+';

const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return PLACEHOLDER_IMAGE;
  
  if (path.startsWith('http')) return path;
  
  // Use the IMAGE_BASE_URL constant from config
  return `${IMAGE_BASE_URL}/${path}`;
};

  useEffect(() => {
    if (memberId) {
      const fetchMemberDetails = async () => {
        try {
          // Dodaj vremenski žig za izbjegavanje keširanja
          const timestamp = getCurrentDate().getTime();
          const response = await api.get(`/members/${memberId}?t=${timestamp}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });

          // Sigurna validacija podatka iz API responsa
          const data: unknown = response.data;
          if (isMember(data)) {
            // Osiguraj da je full_name dostupan i uključuje nadimak
            data.full_name ??= `${data.first_name} ${data.last_name}${data.nickname ? ` - ${data.nickname}` : ''}`;
            setMember(data);
          } else {

            console.error('Neispravan format podataka za člana', data);
          }
        } catch (error) {
          console.error('Failed to fetch member details:', error);
        }
      };

      void fetchMemberDetails(); // Riješeno no-floating-promises
    }
  }, [memberId]);

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }
  // Ako nismo još dohvatili detalje člana, prikazujemo loading
  if (!member && memberId) {
    return <div className="p-6">Loading member details...</div>;
  }

  const getActivityStatus = () => {
    const hours = user.total_hours ?? 0;
    return {
      status: hours >= 20 ? "active" : "passive",
      hours: hours,
    };
  };

  const activityStatus = getActivityStatus();

  const getStatusColor = (status: Member["life_status"]) => {
    switch (status) {
      case "employed/unemployed":
        return "bg-blue-600 text-white";
      case "child/pupil/student":
        return "bg-green-600 text-white";
      case "pensioner":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {user.first_name} {user.last_name}{user.nickname ? ` - ${user.nickname}` : ''}
            </h1>
            <p className="opacity-90">Member Profile</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${activityStatus.status === "active"
                ? "bg-green-500"
                : "bg-yellow-500"
              }`}
          >
            {activityStatus.status.charAt(0).toUpperCase() +
              activityStatus.status.slice(1)}{" "}
            Member
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Card Number</label>
                {/* Sakrij broj kartice od običnih članova zbog sigurnosti */}
                {user.membership_details?.card_number ?? "N/A"}
                {user.role === "member_administrator" || user.role === "member_superuser" ? (
                  <p
                    className={`inline-block px-3 py-1 rounded-lg font-mono ${getStatusColor(
                      user.life_status
                    )}`}
                  >
                    {user.membership_details?.card_number}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    <span className="inline-block px-3 py-1 bg-gray-100 rounded-lg">
                      *** Skriveno ***
                    </span>
                    <span className="text-xs ml-2 text-gray-400">
                      (Vidljivo samo administratorima)
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Status markice</label>
                <div className="flex items-center mt-1">
                  <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${user.membership_details?.card_stamp_issued ? 'bg-black text-white' : 'border border-gray-300'}`}>
                    {user.membership_details?.card_stamp_issued && '✓'}
                  </div>
                  <span className="text-sm">
                    {user.membership_details?.card_stamp_issued ? 'Markica izdana' : 'Markica nije izdana'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Gender</label>
                <p className="capitalize">{user.gender}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date of Birth</label>
                <p>{format(parseISO(user.date_of_birth), "dd.MM.yyyy")}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">OIB</label>
                <p>{user.oib}</p>
              </div>
              <div></div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p>{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p>{user.cell_phone}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p>{user.street_address}</p>
                <p>{user.city}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Life Status</label>
                <p>{user.life_status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Total Hours</label>
                <p className="text-2xl font-bold">{activityStatus.hours ?? 0}</p>
              </div>
              {activityStatus.status === "passive" && (
                <div className="text-yellow-600">
                  <p>
                    Need {20 - activityStatus.hours} more hours to become active
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">
                  Registration Status
                </label>
                <p>{user.registration_completed ? "Completed" : "Pending"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Card Management Section - vidljivo samo administratorima i superuserima */}
        {(user.role === "member_administrator" || user.role === "member_superuser") && member && (
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Upravljanje članskom karticom
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MembershipCardManagerAdapter
                member={member}
                onUpdate={async (updatedMember) => {
                  setMember(updatedMember);
                }}
                userRole={user.role}
                isFeeCurrent={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Membership History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Membership History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user?.membership_history?.periods?.map(
                (period: MembershipPeriod, index: number) => (
                  <div
                    key={index}
                    className="border-l-2 border-purple-500 pl-4 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium">Start: </span>
                      {formatDate(period.start_date)}
                    </div>
                    {period.end_date && (
                      <>
                        <div className="text-sm">
                          <span className="font-medium">End: </span>
                          {formatDate(period.end_date)}
                        </div>
                        {period.end_reason && (
                          <div className="text-sm text-gray-600">
                            Reason: {period.end_reason}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              )}
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm font-medium">Total Duration: </span>
                <span className="text-sm">
                  {user.membership_history?.total_duration ?? "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Membership Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Membership Type</label>
                <p>{user.membership_type ? membershipTypeLabels[user.membership_type] : 'Nije definirano'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status markice</label>
                <div className="flex items-center mt-1">
                  <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${user.membership_details?.card_stamp_issued ? 'bg-black text-white' : 'border border-gray-300'}`}>
                    {user.membership_details?.card_stamp_issued && '✓'}
                  </div>
                  <span className="text-sm">
                    {user.membership_details?.card_stamp_issued ? 'Markica izdana' : 'Markica nije izdana'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Role</label>
                <p>{user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              Equipment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">T-Shirt Size</label>
                <p>{member?.tshirt_size ?? "Not set"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">
                  Shell Jacket Size
                </label>
                <p>{member?.shell_jacket_size ?? "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberProfile;
