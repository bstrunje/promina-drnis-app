// frontend/src/features/dashboard/MemberDashboard.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity, Mail, User, RefreshCw, Bell } from "lucide-react";
import { Member } from "@shared/member";
import { API_BASE_URL } from "@/utils/config";
import axios from "axios";
import { MESSAGE_EVENTS } from "../../utils/events";

interface Props {
  member: Member;
}

interface MemberStats {
  unreadMessages: number;
  recentActivities: number;
  memberCount: number;
}

const MemberDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemberStats>({
    unreadMessages: 0,
    recentActivities: 0,
    memberCount: 0,
  });

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Pokušaj dohvatiti statistike sa servera
      try {
        const statsResponse = await axios.get(`${API_BASE_URL}/members/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ažuriraj podacima sa servera
        setStats({
          unreadMessages: statsResponse.data.unreadMessages || 0,
          recentActivities: statsResponse.data.recentActivities || 0,
          memberCount: statsResponse.data.memberCount || 0,
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

  useEffect(() => {
    fetchDashboardStats();
    
    // Dodajemo slušanje događaja za ažuriranje statistike kad se poruka označi kao pročitana
    const handleUnreadMessagesUpdated = () => {
      fetchDashboardStats();
    };
    
    window.addEventListener(MESSAGE_EVENTS.UNREAD_UPDATED, handleUnreadMessagesUpdated);
    
    return () => {
      window.removeEventListener(MESSAGE_EVENTS.UNREAD_UPDATED, handleUnreadMessagesUpdated);
    };
  }, []);

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Dobrodošli, {member.full_name}</h1>
        <p className="opacity-90">Članski Dashboard</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Pregled Dashboarda</h2>
        
        <button 
          onClick={fetchDashboardStats} 
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
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                <p className="text-sm text-gray-500">
                  {stats.unreadMessages > 0 ? (
                    <span className="flex items-center text-blue-600">
                      <Bell className="h-4 w-4 mr-1" />
                      Nepročitane poruke
                    </span>
                  ) : (
                    "Poruke"
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Aktivnosti Sekcija */}
        <div
          onClick={() => navigate("/activities")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Aktivnosti</h3>
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.recentActivities}</p>
                <p className="text-sm text-gray-500">Nedavne aktivnosti</p>
              </>
            )}
          </div>
        </div>

        {/* Members Sekcija */}
        <div
          onClick={() => navigate("/members")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Članovi</h3>
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{stats.memberCount}</p>
                <p className="text-sm text-gray-500">Ukupno članova</p>
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
            <h3 className="text-gray-600 font-medium">Profil</h3>
            <User className="h-6 w-6 text-orange-600" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              <>
                <p className="text-2xl font-bold">{member.full_name}</p>
                <p className="text-sm text-gray-500">Vaš korisnički profil</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dodatna sekcija za brze akcije */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Moje članstvo</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Status članstva:</span>
              <span className="font-medium">
                {member.status === 'registered' ? (
                  <span className="text-green-600">Aktivno</span>
                ) : (
                  <span className="text-red-600">Neaktivno</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Godina članarine:</span>
              <span className="font-medium">
                {member.membership_details?.fee_payment_year || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Status životne dobi:</span>
              <span className="font-medium">
                {member.life_status || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Godišnja markica:</span>
              <span className="font-medium">
                {member.membership_details?.card_stamp_issued ? "Izdana" : "Nije izdana"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Nadolazeći događaji</h3>
          <div className="text-gray-600 text-center py-6">
            <p>Trenutno nema nadolazećih događaja.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;