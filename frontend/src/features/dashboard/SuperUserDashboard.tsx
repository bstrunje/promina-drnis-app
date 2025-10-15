// frontend/src/features/dashboard/SuperUserDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Activity, Shield, ChevronRight, RefreshCw } from "lucide-react";
import { Member } from "@shared/member";
import { apiClient } from "@/utils/api";
import { useBranding } from "../../hooks/useBranding";

interface Props {
  member: Member;
}

interface DashboardStats {
  totalMembers: number;
  registeredMembers: number; // New field
  activeMembers: number;
  pendingApprovals: number;
  recentActivities: number;
  systemHealth: string;
  lastBackup: string;
}

/**
 * Tip za odgovor API-ja s dashboarda
 */
interface DashboardStatsResponse {
  totalMembers: number;
  registeredMembers: number;
  activeMembers: number;
  pendingRegistrations: number;
  recentActivities: number;
  systemHealth: string;
  lastBackup: string;
}

const SuperUserDashboard: React.FC<Props> = ({ member }) => {
  // console.log('Rendering SuperUserDashboard for:', member.full_name);
  const navigate = useNavigate();
  const { t } = useTranslation('dashboards');
  const { getPrimaryColor, branding } = useBranding();

  // Dinamički odabir welcome poruke na temelju spola
  const getWelcomeKey = () => {
    return member.gender === 'female' ? 'welcome_female' : 'welcome_male';
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    registeredMembers: 0, // New field
    activeMembers: 0,
    pendingApprovals: 0,
    recentActivities: 0,
    systemHealth: "Unknown",
    lastBackup: "Never",
  });

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // apiClient automatski dodaje Authorization header i tenant parametar
      const memberResponse = await apiClient.get<DashboardStatsResponse>('/admin/dashboard/stats');
      
      // Update with real data
      setStats({
        totalMembers: memberResponse.data.totalMembers ?? 0,
        registeredMembers: memberResponse.data.registeredMembers ?? 0,
        activeMembers: memberResponse.data.activeMembers ?? 0,
        pendingApprovals: memberResponse.data.pendingRegistrations ?? 0,
        recentActivities: memberResponse.data.recentActivities ?? 0,
        systemHealth: memberResponse.data.systemHealth ?? "Unknown",
        lastBackup: memberResponse.data.lastBackup ?? "Never",
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Failed to load dashboard data. Please try again later.");
      
      // Keep the default stats if there's an error
    } finally {
      setLoading(false);
    }
  }, []);

  // Učitaj podatke pri mount-u i kad se promijeni branding (tenant)
  useEffect(() => {
    if (branding) {
      console.log('[SUPERUSER-DASHBOARD] Učitavam podatke za tenant:', branding.subdomain, '(ID:', branding.id, ')');
      void fetchDashboardStats();
    }
  }, [branding, fetchDashboardStats]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">{t(getWelcomeKey(), { name: member.full_name })}</h1>
        <p className="text-sm md:text-base opacity-90">{t("header.superUserDashboard")}</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t("overview")}</h2>
        
        <button 
          onClick={() => void fetchDashboardStats()} 
          disabled={loading}
          className="flex items-center text-sm hover:opacity-80"
          style={{ color: getPrimaryColor() }}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t("refreshing") : t("refreshData")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div
          onClick={() => navigate("/members")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">{t("members.members")}</h3>
            <Users className="h-6 w-6" style={{ color: getPrimaryColor() }} />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
                <p className="text-sm text-gray-500">
                  {stats.registeredMembers} {t("members.registered")}, {stats.activeMembers} {t("members.active")} 
                  {stats.registeredMembers > 0 ? 
                    ` (${((stats.activeMembers / stats.registeredMembers) * 100).toFixed(1)}% active)` : 
                    ''}
                </p>
              </>
            )}
          </div>
        </div>

        <div
          onClick={() => navigate("/activities")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">{t("activities.recentActivities")}</h3>
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.recentActivities}</p>
                <p className="text-sm text-gray-500">{t("activities.inLast30Days")}</p>
              </>
            )}
          </div>
        </div>

        <div
          onClick={() => navigate("/members?filter=pending")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">{t("pendingRegistrations.title")}</h3>
            <Shield className="h-6 w-6 text-orange-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                <p className="text-sm text-gray-500">{t("pendingRegistrations.awaitPasswordAssignment")}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">{t("quickActions.title")}</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/members")}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>{t("quickActions.memberManagement")}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={() => navigate("/activities")}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>{t("quickActions.activityApprovals")}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>{t("quickActions.systemSettings")}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SuperUserDashboard;
