// frontend/src/features/dashboard/MemberDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import { formatHoursToHHMM } from '../../utils/activityHours';
import { Users, Activity as ActivityIcon, Mail, User, RefreshCw, Bell, Calendar } from 'lucide-react';
import { Member } from '@shared/member';
import { Activity } from '@shared/activity.types';
import { getAllActivitiesWithParticipants } from '../../utils/api/apiActivities';
import { API_BASE_URL } from '@/utils/config';
import axios from 'axios';
import { MESSAGE_EVENTS } from '../../utils/events';
import { formatInputDate } from '../../utils/dateUtils';

interface Props {
  member: Member;
}

interface MemberStats {
  unreadMessages: number;
  recentActivities: number; // Ovo polje se više neće direktno koristiti za prikaz
  memberCount: number;
}

interface AnnualStat {
  year: number;
  total_hours: number;
  total_activities: number;
}

/**
 * Tip za odgovor API-ja s dashboarda
 */
interface DashboardStatsResponse {
  unreadMessages: number;
  recentActivities: number;
  memberCount: number;
}

const MemberDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemberStats>({
    unreadMessages: 0, // Više se ne koristi, ali ostaje zbog tipa
    recentActivities: 0,
    memberCount: 0,
  });
  const [activityTotals, setActivityTotals] = useState({ activities: 0, hours: 0 });
  const { unreadCount, refreshUnreadCount } = useUnreadMessages();
  const [fullMember, setFullMember] = useState<Member>(member);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);

  const getActivityStatus = (totalHours: number | null | undefined) => {
    return (totalHours ?? 0) >= 20 ? "active" : "passive";
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Pokušaj dohvatiti statistike sa servera
      try {
        const statsResponse = await axios.get<DashboardStatsResponse>(`${API_BASE_URL}/members/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ažuriraj podacima sa servera
        setStats({
          unreadMessages: statsResponse.data.unreadMessages ?? 0,
          recentActivities: statsResponse.data.recentActivities ?? 0,
          memberCount: statsResponse.data.memberCount ?? 0,
        });
      } catch (apiErr) {
        console.error("API error:", apiErr);
        
        // PRIVREMENO: Postavi mock vrijednost za memberCount da korisnik vidi primjer
        // Ovo se može ukloniti kad backend API bude funkcionalan
        setStats(prevStats => ({
          ...prevStats,
          memberCount: 5 // Privremena mock vrijednost
        }));
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Neuspješno učitavanje podataka dashboarda. Molimo pokušajte ponovno kasnije.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingActivities = async () => {
    try {
      // Dohvaćamo SVE aktivnosti s podacima o sudionicima
      const allActivities = await getAllActivitiesWithParticipants();

      // Filtriramo ih na klijentu da prikažemo samo PLANNED i ACTIVE
      const upcoming = allActivities.filter(
        activity => activity.status === 'PLANNED' || activity.status === 'ACTIVE'
      );

      // Sortiramo aktivnosti po datumu početka kako bi bile kronološki poredane
      upcoming.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      setUpcomingActivities(upcoming);
    } catch (err) {
      console.error('Failed to fetch upcoming activities:', err);
    }
  };

  useEffect(() => {
    void fetchDashboardStats();
    void refreshUnreadCount(); // Inicijalno učitavanje broja nepročitanih poruka

    const fetchAnnualStats = async () => {
      if (member?.member_id) {
        try {
          console.log('Fetching annual stats for member ID:', member.member_id);
          const token = localStorage.getItem('token');
          const response = await axios.get<AnnualStat[]>(`${API_BASE_URL}/members/${member.member_id}/annual-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('Received annual stats data:', response.data);

          const totals = response.data.reduce((acc, stat) => {
            acc.activities += stat.total_activities;
            acc.hours += parseFloat(stat.total_hours as any) || 0; // Pretvaramo string u broj
            return acc;
          }, { activities: 0, hours: 0 });

          console.log('Calculated totals:', totals);
          setActivityTotals(totals);
        } catch (err) {
          console.error("Error fetching annual stats:", err);
          // Ovdje ne postavljamo globalnu grešku da ne bi blokiralo ostatak dashboarda
        }
      }
    };

    const fetchMemberDetails = async () => {
      const fetchMemberData = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_BASE_URL}/members/${member.member_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFullMember(response.data);
        } catch (error) {
          console.error('Failed to fetch full member data:', error);
        }
      };



      void fetchMemberData();
      void fetchUpcomingActivities();
    };

    void fetchMemberDetails();
    void fetchAnnualStats();
  }, [member?.member_id]);

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Dobrodošli, {fullMember.full_name}</h1>
        <p className="opacity-90">Članski Dashboard</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Pregled Dashboarda</h2>
        
        <button 
          onClick={() => void fetchDashboardStats()} 
          disabled={loading}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Osvježavanje...' : 'Osvježi podatke'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Messages Sekcija */}
        <div
          onClick={() => navigate("/messages")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Poruke</h3>
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-gray-500">
                  {stats.unreadMessages > 0 ? (
                    <span className="flex items-center text-blue-600">
                      <Bell className="h-4 w-4 mr-1" />
                      {t("dashboard.messages.unreadMessages")}
                    </span>
                  ) : (
                    t("dashboard.messages.messages")
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Aktivnosti Sekcija */}
        <Link
          to={`/members/${member.member_id}/activities-overview`}
          className="block bg-white p-6 rounded-lg shadow-sm border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">{t("dashboard.activities.allMyActivities")}</h3>
            <ActivityIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            {loading ? (
              <>
                <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
                <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-2xl font-bold">{activityTotals.activities}</p>
                  <p className="text-sm text-gray-500">{t("dashboard.activities.totalActivities")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatHoursToHHMM(activityTotals.hours)}</p>
                  <p className="text-sm text-gray-500">{t("dashboard.activities.totalHours")}</p>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Members Sekcija */}
        <div
          onClick={() => navigate("/members")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">{t("dashboard.members.members")}</h3>
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.memberCount}</p>
                <p className="text-sm text-gray-500">{t("dashboard.members.totalActiveMembers")}</p>
              </>
            )}
          </div>
        </div>

        {/* Profile Sekcija */}
        <div
          onClick={() => navigate("/profile")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">{t("dashboard.profile.profile")}</h3>
            <User className="h-6 w-6 text-orange-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{fullMember.full_name}</p>
                <p className="text-sm text-gray-500">{t("dashboard.profile.yourUserProfile")}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dodatna sekcija za brze akcije */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">{t("dashboard.membership.myMembership")}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("dashboard.membership.membershipStatus")}</span>
              <span className="font-medium">
                {getActivityStatus(fullMember.total_hours) === 'active' ? (
                  <span className="text-green-600">{t("dashboard.membership.active")}</span>
                ) : (
                  <span className="text-yellow-600">{t("dashboard.membership.passive")}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("dashboard.membership.membershipYear")}</span>
              <span className="font-medium">
                {fullMember.membership_details?.fee_payment_year ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("dashboard.membership.lifeStatus")}</span>
              <span className="font-medium">
                {fullMember.life_status ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("dashboard.membership.annualStamp")}</span>
              <span className="font-medium">
                {fullMember.membership_details?.card_stamp_issued ? t("dashboard.membership.issued") : t("dashboard.membership.notIssued")}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-500" />
            {t("dashboard.upcomingEvents.title")}
          </h3>
          {upcomingActivities.length > 0 ? (
            <ul className="space-y-3">
              {upcomingActivities.map(activity => (
                <li key={activity.activity_id} className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <Link to={`/activities/${activity.activity_id}`} className="block">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{activity.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatInputDate(activity.start_date)} - {activity.activity_type?.name}
                        </p>
                      </div>
                      {(() => {
                        switch (activity.status) {
                          case 'PLANNED':
                            return <span className="font-semibold text-green-600 text-sm">{t("dashboard.upcomingEvents.planned")}</span>;
                          case 'ACTIVE':
                            return <span className="font-semibold text-blue-500 text-sm">{t("dashboard.upcomingEvents.active")}</span>;
                          default:
                            return null;
                        }
                      })()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-600 text-center py-6">
              <p>{t("dashboard.upcomingEvents.noUpcomingEvents")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;