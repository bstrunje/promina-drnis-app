import React, { useEffect, useState } from "react";
import { NavigateFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Activity, Mail } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@components/ui/dropdown-menu";
import { Badge } from "@components/ui/badge";
import { getAllMembers } from "@/utils/api/apiMembers";
import type { Member } from "@shared/member";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog";

interface DashboardNavCardsProps {
  navigate: NavigateFunction;
  unreadMessages: boolean;
}

/**
 * Komponenta za prikaz navigacijskih kartica na admin dashboardu
 */
export const DashboardNavCards: React.FC<DashboardNavCardsProps> = ({ 
  navigate, 
  unreadMessages 
}) => {
  const { t } = useTranslation('dashboards');
  // Lokalno stanje za brojace (bez izmjene MemberList-a)
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(false);
  const [quickView, setQuickView] = useState<"pending" | "without-card" | "without-stamp" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Kontrolirano stanje za Dropdown kako bismo izbjegli "zaleđenu" overlay situaciju
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingCounts(true);
        const data = await getAllMembers();
        if (mounted) setMembers(data);
      } catch {
        // Tihi fallback – kartica i dalje radi bez brojaca
        if (mounted) setMembers([]);
      } finally {
        if (mounted) setLoadingCounts(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const pendingCount = members ? members.filter(m => (m.status ?? 'pending') === 'pending').length : 0;
  const withoutCardCount = members ? members.filter(m => !m.membership_details?.card_number).length : 0;
  const withoutStampCount = members ? members.filter(m => m.membership_details?.card_stamp_issued !== true).length : 0;

  // Izračun filtriranih članova za quick view
  const filteredQuickMembers: Member[] = React.useMemo(() => {
    if (!members || !quickView) return [];
    switch (quickView) {
      case 'pending':
        return members.filter(m => (m.status ?? 'pending') === 'pending');
      case 'without-card':
        return members.filter(m => !m.membership_details?.card_number);
      case 'without-stamp':
        return members.filter(m => m.membership_details?.card_stamp_issued !== true);
      default:
        return [];
    }
  }, [members, quickView]);

  // Naslov dijaloga preuzet iz i18n ključeva
  const quickLabelKey = quickView === 'pending'
    ? 'navigation.memberManagement.quick.pending'
    : quickView === 'without-card'
      ? 'navigation.memberManagement.quick.withoutCard'
      : quickView === 'without-stamp'
        ? 'navigation.memberManagement.quick.withoutStamp'
        : '';
  const quickTitle = quickView ? t(quickLabelKey) : '';
  const quickNavigateParam = quickView ? `/members?quick=${quickView}` : '/members';
  
  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
         <DropdownMenuTrigger asChild>
           <div
             className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
             role="button"
             aria-haspopup="menu"
             aria-label={t("navigation.memberManagement.title")}
           >
             <div className="flex justify-between items-center mb-2">
               <h3 className="font-medium">{t("navigation.memberManagement.title")}</h3>
               <Users className="h-5 w-5 text-purple-600" />
             </div>
             {/* Uklonjen podnaslov po zahtjevu */}
           </div>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMenuOpen(false); setQuickView('pending'); setDialogOpen(true); }}
              className="flex justify-between items-center">
             <span>{t('navigation.memberManagement.quick.pending')}</span>
              <Badge variant="secondary">{loadingCounts && members === null ? '…' : pendingCount}</Badge>
            </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMenuOpen(false); setQuickView('without-card'); setDialogOpen(true); }}
              className="flex justify-between items-center">
             <span>{t('navigation.memberManagement.quick.withoutCard')}</span>
              <Badge variant="secondary">{loadingCounts && members === null ? '…' : withoutCardCount}</Badge>
            </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMenuOpen(false); setQuickView('without-stamp'); setDialogOpen(true); }}
              className="flex justify-between items-center">
             <span>{t('navigation.memberManagement.quick.withoutStamp')}</span>
              <Badge variant="secondary">{loadingCounts && members === null ? '…' : withoutStampCount}</Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
           <DropdownMenuItem onSelect={() => { setMenuOpen(false); navigate("/members"); }}>
             {t('navigation.memberManagement.quick.openList')}
            </DropdownMenuItem>
          </DropdownMenuContent>
       </DropdownMenu>

      {/* Quick view dijalog s odmah filtriranim članovima */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setMenuOpen(false); } }}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>{quickTitle}</DialogTitle>
             <DialogDescription>
               {t('navigation.memberManagement.quick.dialogDescription', { count: filteredQuickMembers.length })}
             </DialogDescription>
           </DialogHeader>
           <div className="max-h-80 overflow-auto mt-2 border rounded-md">
             <table className="min-w-full text-sm">
               <thead className="bg-gray-50 text-gray-600">
                 <tr>
                   <th className="px-3 py-2 text-left">{t('navigation.memberManagement.quick.table.name')}</th>
                   <th className="px-3 py-2 text-left">{t('navigation.memberManagement.quick.table.email')}</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredQuickMembers.map((m) => (
                   <tr key={m.member_id} className="border-t">
                     <td className="px-3 py-2">{m.full_name ?? `${m.first_name} ${m.last_name}`}</td>
                     <td className="px-3 py-2">{m.email}</td>
                   </tr>
                 ))}
                 {filteredQuickMembers.length === 0 && (
                   <tr>
                     <td className="px-3 py-6 text-center text-gray-500" colSpan={2}>{t('navigation.memberManagement.quick.noResults')}</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
           <div className="flex justify-end gap-2 mt-4">
             <button
               className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
               onClick={() => { setDialogOpen(false); setMenuOpen(false); }}
             >
               {t('navigation.memberManagement.quick.close')}
             </button>
             <button
               className="px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
               onClick={() => {
                 // Zatvori sve overlaye pa tek onda navigiraj (sljedeći tick)
                 setDialogOpen(false);
                 setMenuOpen(false);
                 if (quickView) {
                   setTimeout(() => navigate(quickNavigateParam), 0);
                 }
               }}
             >
               {t('navigation.memberManagement.quick.openList')}
             </button>
           </div>
         </DialogContent>
       </Dialog>

      <div
        onClick={() => navigate("/activities")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">{t("navigation.activityManagement.title")}</h3>
          <Activity className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">{t("navigation.activityManagement.description")}</p>
      </div>

      <div
        onClick={() => navigate("/messages")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">{t("messages.title")}</h3>
          <Mail className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">
          {unreadMessages ? (
            <span className="text-red-600">{t("messages.unreadMessages")}</span>
          ) : (
            t("messages.noUnreadMessages")
          )}
        </p>
      </div>
    </>
  );
};

export default DashboardNavCards;
