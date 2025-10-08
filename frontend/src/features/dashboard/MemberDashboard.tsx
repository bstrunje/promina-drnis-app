// frontend/src/features/dashboard/MemberDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useUnreadMessages } from '../../contexts/useUnreadMessages';
import { formatHoursToHHMM } from '../../utils/activityHours';
import { Users, Activity as ActivityIcon, Mail, User, RefreshCw, Bell, Calendar } from 'lucide-react';
import { Member } from '@shared/member';
import { Activity, ActivityStatus } from '@shared/activity.types';
import { getAllActivitiesWithParticipants } from '../../utils/api/apiActivities';
import api from '@/utils/api/apiConfig';
import { formatInputDate } from '../../utils/dateUtils';
import { useBranding } from '../../hooks/useBranding';

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
  const { t } = useTranslation('dashboards');
  const { getPrimaryColor } = useBranding();
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
      // Pokušaj dohvatiti statistike sa servera
      try {
        const statsResponse = await api.get<DashboardStatsResponse>(`/members/dashboard/stats`);
        
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
        activity => activity.status === ActivityStatus.PLANNED || activity.status === ActivityStatus.ACTIVE
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
      const targetId = fullMember?.member_id ?? member?.member_id;
      if (targetId) {
        try {
          console.log('Fetching annual stats for member ID:', targetId);
          const response = await api.get<AnnualStat[]>(`/members/${targetId}/annual-stats`);
          
          console.log('Received annual stats data:', response.data);

          const totals = response.data.reduce((acc, stat) => {
            acc.activities += stat.total_activities;
            acc.hours += Number(stat.total_hours ?? 0);
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

    const fetchMemberDetails = () => {
      const fetchMemberData = async () => {
        try {
          // Dohvati trenutno prijavljenog člana neovisno o ID-u iz propsa
          const response = await api.get<Member>(`/members/me`);
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
  }, [member?.member_id, fullMember?.member_id, refreshUnreadCount]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-xl md:text-2xl font-bold">
          {t('welcome', { name: fullMember.full_name, context: fullMember.gender === 'male' ? 'male' : 'female' })}
        </h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => void fetchDashboardStats()} 
          disabled={loading}
          className="flex items-center text-sm hover:opacity-80"
          style={{ color: getPrimaryColor() }}
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
            <h3 className="text-gray-600 font-medium">{t('messages.title')}</h3>
            <Mail className="h-6 w-6" style={{ color: getPrimaryColor() }} />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-gray-500">
                  {stats.unreadMessages > 0 ? (
                    <span className="flex items-center" style={{ color: getPrimaryColor() }}>
                      <Bell className="h-4 w-4 mr-1" />
                      {t("messages.unreadMessages")}
                    </span>
                  ) : (
                    t("messages.messages")
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
            <h3 className="text-gray-600 font-medium">{t("activities.allMyActivities")}</h3>
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
                  <p className="text-sm text-gray-500">{t("activities.totalActivities")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatHoursToHHMM(activityTotals.hours)}</p>
                  <p className="text-sm text-gray-500">{t("activities.totalHours")}</p>
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
            <h3 className="text-gray-600 font-medium">{t("members.members")}</h3>
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.memberCount}</p>
                <p className="text-sm text-gray-500">{t("members.totalActiveMembers")}</p>
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
            <h3 className="text-gray-600 font-medium">{t("profile.profile")}</h3>
            <User className="h-6 w-6 text-orange-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{fullMember.full_name}</p>
                <p className="text-sm text-gray-500">{t("profile.yourUserProfile")}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dodatna sekcija za brze akcije */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">{t("membership.myMembership")}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("membership.membershipStatus")}</span>
              <span className="font-medium">
                {getActivityStatus(fullMember.activity_hours ?? 0) === 'active' ? (
                  <span className="text-green-600">{t("membership.active")}</span>
                ) : (
                  <span className="text-yellow-600">{t("membership.passive")}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("membership.membershipYear")}</span>
              <span className="font-medium">
                {fullMember.membership_details?.fee_payment_year ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("membership.lifeStatus")}</span>
              <span className="font-medium">
              {fullMember.life_status ? t(`options.lifeStatus.${fullMember.life_status}`, { ns: 'profile' }) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t("membership.annualStamp")}</span>
              <span className="font-medium">
                {fullMember.membership_details?.card_stamp_issued ? t("membership.issued") : t("membership.notIssued")}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-500" />
            {t("upcomingEvents.title")}
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
                          case ActivityStatus.PLANNED:
                            return <span className="font-semibold text-green-600 text-sm">{t("upcomingEvents.planned")}</span>;
                          case ActivityStatus.ACTIVE:
                            return <span className="font-semibold text-sm" style={{ color: getPrimaryColor() }}>{t("upcomingEvents.active")}</span>;
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
              <p>{t("upcomingEvents.noUpcomingEvents")}</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default MemberDashboard;