// frontend/src/features/members/MemberProfile.tsx
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Clock, Calendar, Award, User, Clipboard } from "lucide-react";
import { MembershipPeriod, MembershipHistory } from "@shared/membership";
import { Member } from "@shared/member";
import { format, parseISO } from 'date-fns';

declare module "@shared/member" {
  interface Member {
    membership_history?: MembershipHistory;
  }
}

const MemberProfile = () => {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6">Loading...</div>;
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
              {user.first_name} {user.last_name}
            </h1>
            <p className="opacity-90">Member Profile</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              activityStatus.status === "active"
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
                {user.membership_details?.card_number ? (
                  <p
                    className={`inline-block px-3 py-1 rounded-lg font-mono ${getStatusColor(
                      user.life_status
                    )}`}
                  >
                    {user.membership_details.card_number}
                  </p>
                ) : (
                  <p className="text-gray-400">Not assigned</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Gender</label>
                <p className="capitalize">{user.gender}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date of Birth</label>
                <p>{format(parseISO(user.date_of_birth), 'dd.MM.yyyy')}</p>
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
                <p className="text-2xl font-bold">{activityStatus.hours}</p>
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
                      {new Date(period.start_date).toLocaleDateString()}
                    </div>
                    {period.end_date && (
                      <>
                        <div className="text-sm">
                          <span className="font-medium">End: </span>
                          {new Date(period.end_date).toLocaleDateString()}
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
                  {user.membership_history?.total_duration || "N/A"}
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
                <p>{user.membership_type}</p>
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
                <p>{user.tshirt_size}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">
                  Shell Jacket Size
                </label>
                <p>{user.shell_jacket_size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberProfile;
