import React from "react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import {
  // CalendarDays se ne koristi pa ga uklanjamo
  BarChart,
  ChevronDown,
  ChevronUp,
  Filter,
  Printer,
  Shield,
  UserPlus,
  Users
} from "lucide-react";
import { Alert, AlertDescription } from "@/../components/ui/alert.js";
import { Member } from "@shared/member";
import { MemberWithDetails } from "@shared/memberDetails.types"; // Already updated above
import AddMemberForm from "./AddMemberForm";
import EditMemberForm from "@components/EditMemberForm";
import RoleAssignmentModal from "./RoleAssignmentModal";
import { Button } from "@components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useBranding } from "../../hooks/useBranding";


// Import custom hook for fetching member data
import { useMemberData } from "./hooks/useMemberData";
// Import filter component
import MemberListFilters from "./components/MemberListFilters";
// Import table display component
// Import statistics component
import { StatisticsView } from "./components/StatisticsView";
// Import custom hook for filtering and sorting
import { useFilteredMembers } from "./hooks/useFilteredMembers";
import MemberTable from "./components/MemberTable";

export default function MemberList(): JSX.Element {
  const { t } = useTranslation('members');
  const { getPrimaryColor } = useBranding();
  const [searchParams] = useSearchParams();

  // Dobavi članove pomoću custom hooka
  const {
    members,
    loading,
    error,
    addMember,
    updateMember,

    refreshMembers
  } = useMemberData();

  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Style for printing directly in the component
  useEffect(() => {
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        /* Sakrivanje svih nepotrebnih elemenata za print */
        [class~="print:hidden"],
        .filter-section,
        nav,
        header,
        button,
        [role="tab"],
        [role="tablist"],
        .tabs-list,
        .tab-trigger {
          display: none !important;
        }
        
        /* Osiguravanje da je tablica za printanje vidljiva */
        .print-table,
        [class~="print:table"],
        [class~="print:!table"] {
          display: table !important;
        }

        /* Osiguravanje da je header za printanje vidljiv */
        [class~="print:block"],
        #print-header {
          display: block !important;
        }
        
        /* Čišćenje margina i paddinga */
        body {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Kontroliranje preloma stranice */
        #print-header {
          page-break-after: avoid;
        }
      }
    `;
    document.head.appendChild(printStyle);

    return () => {
      if (printStyle.parentNode) {
        document.head.removeChild(printStyle);
      }
    };
  }, []);

  // Modals - states
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [roleAssignmentMember, setRoleAssignmentMember] = useState<Member | null>(null);

  // Check if user has admin privileges (for editing, deleting, adding members)
  const isAdmin = user?.role === "member_administrator" || user?.role === "member_superuser";
  const isSuperuser = user?.role === "member_superuser";

  // States for filtering and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"regular" | "all" | "active" | "passive" | "paid" | "unpaid" | "pending">("regular");
  const [ageFilter, setAgeFilter] = useState<"all" | "adults">("all");
  const [sortCriteria, setSortCriteria] = useState<"name" | "hours">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupByType, setGroupByType] = useState<boolean>(false);

  const [showFilters, setShowFilters] = useState<boolean>(false); // State for showing/hiding filters
  const [showNavTabs, setShowNavTabs] = useState<boolean>(true); // State for showing/hiding navigation tabs - visible on desktop, but not on mobile
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const [touchStartY, setTouchStartY] = useState(0); // For tracking swipe gesture
  // This variable is used in the useEffect function to check the screen size
  const [, setIsMobile] = useState(false);

  // Sync filters with URL
  useEffect(() => {
    const filterFromUrl = searchParams.get('filter');
    if (
      filterFromUrl === 'pending' ||
      filterFromUrl === 'regular' ||
      filterFromUrl === 'all' ||
      filterFromUrl === 'active' ||
      filterFromUrl === 'passive' ||
      filterFromUrl === 'paid' ||
      filterFromUrl === 'unpaid'
    ) {
      setActiveFilter(filterFromUrl);
    } else {
      setActiveFilter('regular'); // zadana vrijednost je 'regular'
    }
  }, [searchParams]);

  // Automatski postavi sortiranje po satima silazno kada je aktivan regular filter
  useEffect(() => {
    if (activeFilter === 'regular') {
      setSortCriteria('hours');
      setSortOrder('desc');
    }
  }, [activeFilter]);

  // We use a custom hook for filtering and sorting
  const { filteredMembers: filteredMembersRaw } = useFilteredMembers({
    members,
    searchTerm,
    activeFilter,
    ageFilter,
    sortCriteria,
    sortOrder,
    groupByType
  });

  // Memoized function for grouping members by status
  const groupMembers = React.useCallback((memberList: MemberWithDetails[]): { key: string; title: string; members: MemberWithDetails[]; }[] => {
    if (groupByType) {
      const groups: Record<string, MemberWithDetails[]> = {};
      memberList.forEach(member => {
        const status = member.life_status ?? 'unknown';
        if (!groups[status]) groups[status] = [];
        groups[status].push(member);
      });
      return Object.entries(groups).map(([status, members]) => ({
        key: status,
        title: status.charAt(0).toUpperCase() + status.slice(1),
        members
      }));
    } else {
      return [{ key: 'all', title: t('memberList.groups.allMembers'), members: memberList }];
    }
  }, [groupByType, t]);

  // Handlers as in a modular approach
  const handleAddMember = async (newMember: Member) => {
    const success = await addMember(newMember);
    if (success) {
      setShowAddForm(false);
    }
  };

  const handleEditMember = async (updatedMember: Member) => {
    const success = await updateMember(String(updatedMember.member_id), updatedMember);
    if (success) {
      setEditingMember(null);
    }
  };




  const [filteredMembers, setFilteredMembers] = useState<{
    key: string;
    title: string;
    members: MemberWithDetails[];
  }[]>([]);

  useEffect(() => {
    setFilteredMembers(groupMembers(filteredMembersRaw));
  }, [filteredMembersRaw, groupByType, groupMembers]);

  // Postavi filtrirane članove na temelju grupiranih podataka
  useEffect(() => {
    setFilteredMembers(groupMembers(filteredMembersRaw));
  }, [filteredMembersRaw, groupByType, groupMembers]);

  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Always show tabs on larger screens
      if (!mobile) {
        setShowNavTabs(true);
      }
      // On mobile, we hide by default
      else if (mobile && showNavTabs === true) {
        setShowNavTabs(false);
      }
    };

    // Initial check
    checkIsMobile();

    // Listen for window resize changes
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [showNavTabs]);

  useEffect(() => {
    // Add style for printing
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        /* Hide everything that should not be printed */
        header, nav, .logo-container, button, .navigation-menu, .primary-navigation,
        [class~="print:hidden"], #global-header, .items-center.gap-2, .amber-50, 
        [aria-label="${t('memberList.buttons.filters')}"], [class*="${t('memberList.found')}"], .flex.items-center.bg-amber-50 {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, [t]);



  // Function for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;

    // If the user has pulled down enough and is not already in the process of refreshing
    if (diff > 100 && !refreshing && window.scrollY === 0) {
      setRefreshing(true);

      // Refresh data
      refreshMembers();

      // Set a timer to reset the state after refreshing
      setTimeout(() => {
        setRefreshing(false);
      }, 1000); // Short delay for better UX
    }
  };

  // Function for swipe to show/hide navigation tabs
  const handleSwipeForNav = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const touchEndY = touchY;
    const diff = touchEndY - touchStartY;

    // If swipe down and tabs are not visible
    if (diff > 50 && !showNavTabs) {
      setShowNavTabs(true);
    }
    // If swipe up and tabs are visible
    else if (diff < -50 && showNavTabs) {
      setShowNavTabs(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 border-b border-gray-200" onTouchStart={handleTouchStart} onTouchMove={(e) => {
      handleTouchMove(e);
      handleSwipeForNav(e);
    }}>


      {/* Prikaz greške ako postoji */}
      {error && (
        <Alert variant="destructive" className="mb-4 print:hidden">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-8 print:hidden">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderTopColor: getPrimaryColor(), borderBottomColor: getPrimaryColor() }}></div>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 h-[calc(100vh-100px)]">
          <Tabs defaultValue="list" className="w-full h-full flex flex-col">
            {/* Fiksno zaglavlje - ostaje na mjestu prilikom skrolanja */}
            <div className={`sticky top-0 z-10 bg-gray-50 flex-shrink-0 ${!showNavTabs ? 'border-b border-gray-200' : ''} print:hidden`}>
              {/* Svi gumbi u jednom redu */}
              <div className="px-4 py-2 flex items-center justify-between border-b border-gray-200">
                {/* Lijeva strana - navigacijski tabovi */}
                <div className="flex items-center">
                  <TabsList>
                    <TabsTrigger value="list" className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="hidden md:inline">{t('memberList.tabs.list')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="flex items-center">
                      <BarChart className="w-4 h-4 mr-2" />
                      <span className="hidden md:inline">{t('memberList.tabs.statistics')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Desna strana - ostali gumbi */}
                <div className="flex items-center gap-2 flex-wrap print:hidden">
                  {/* Member counter */}
                  <div className="flex items-center bg-amber-50 border border-amber-200 rounded-md px-3 py-1">
                    <span className="text-sm font-medium text-gray-500 mr-1 hidden md:inline">{t('memberList.found')}:</span>
                    <span className="text-lg font-bold text-amber-600">
                      {filteredMembers.reduce((count, group) => count + group.members.length, 0)}
                    </span>
                  </div>

                  {/* Gumb Filteri */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-gray-700 hover:text-gray-900"
                  >
                    <Filter className="w-4 h-4 md:mr-1" />
                    <span className="hidden md:inline">{t('memberList.buttons.filters')}</span>
                    {showFilters ?
                      <ChevronUp className="w-4 h-4 hidden md:inline md:ml-1" /> :
                      <ChevronDown className="w-4 h-4 hidden md:inline md:ml-1" />
                    }
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 hidden md:flex"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4 md:mr-1" />
                    <span className="hidden md:inline">{t('printList')}</span>
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-black text-white"
                      onClick={() => setShowAddForm(true)}
                    >
                      <UserPlus className="w-4 h-4 md:mr-1" />
                      <span className="hidden md:inline">{t('addMember')}</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-3 border-b border-gray-200 print:hidden">
                {showFilters && (
                  <MemberListFilters
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    activeFilter={activeFilter}
                    onActiveFilterChange={setActiveFilter}
                    ageFilter={ageFilter}
                    onAgeFilterChange={setAgeFilter}
                    sortCriteria={sortCriteria}
                    onSortCriteriaChange={setSortCriteria}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    groupType={groupByType ? "true" : ""}
                    onGroupTypeChange={(value) => setGroupByType(!!value)}
                    onCloseFilters={() => setShowFilters(false)}
                  />
                )}

                {/* Uklonjen brojač s ovog mjesta jer je premješten na vrh */}
              </div>
            </div>

            {/* Ovdje je tablica s članovima */}
            <TabsContent value="list" className="flex-grow overflow-hidden flex flex-col">
              {/* Obavijest o pending filteru */}
              {activeFilter === 'pending' && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mx-4 mt-2">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-orange-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        {t('memberList.filters.pendingNotice') || 'Prikazani su samo članovi na čekanju (pending status)'}
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        {t('memberList.filters.pendingDescription') || 'Ovi članovi čekaju dodjelu lozinke od strane administratora.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Skrolabilna tablica članova */}
              <div ref={printRef} className="overflow-auto flex-grow">
                <MemberTable
                  filteredMembers={filteredMembers}
                  isAdmin={isAdmin}
                  isSuperuser={isSuperuser}
                  onViewDetails={(memberId) => navigate(`/members/${memberId}`)}
                />
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="flex-grow overflow-auto">
              <StatisticsView members={members} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Modal Forms */}
      {showAddForm && (
        <AddMemberForm
          onClose={() => setShowAddForm(false)}
          onAdd={(newMember) => { void handleAddMember(newMember); }}
        />
      )}

      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onEdit={(updatedMember) => { void handleEditMember(updatedMember); }}
        />
      )}

      {/* Uklonjeno: AssignCardNumberForm modal jer se dodjela kartice radi na drugom mjestu */}

      {roleAssignmentMember && (
        <RoleAssignmentModal
          member={roleAssignmentMember}
          onClose={() => setRoleAssignmentMember(null)}
          onAssign={() => refreshMembers()}
        />
      )}
    </div>
  );
}
