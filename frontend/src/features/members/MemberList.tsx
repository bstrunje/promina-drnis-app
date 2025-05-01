import React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  CalendarDays,
  BarChart,
  ChevronDown,
  ChevronUp,
  Filter,
  Printer,
  UserPlus,
  Users
} from "lucide-react";
import { Alert, AlertDescription } from "@/../components/ui/alert.js";
import { Member } from "@shared/member";
import { MemberWithDetails } from "./interfaces/memberTypes";
import AddMemberForm from "./AddMemberForm";
import EditMemberForm from "@components/EditMemberForm";
import ConfirmationModal from "@components/ConfirmationModal";
import AssignCardNumberForm from "@components/AssignCardNumberForm";
import RoleAssignmentModal from "./RoleAssignmentModal";
import { Button } from "@components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { formatDate, getCurrentDate } from "../../utils/dateUtils";

// Uvoz custom hooka za dohvat podataka o članovima
import { useMemberData } from "./hooks/useMemberData";
// Uvoz komponente za filtriranje
import { MemberListFilters } from "./components/MemberListFilters";
// Uvoz komponente za prikaz tablice
import { MemberTable, filterOnlyColoredRows } from "./components/MemberTable";
// Uvoz komponente za prikaz statistike
import { StatisticsView } from "./components/StatisticsView";
// Uvoz custom hooka za filtriranje i sortiranje
import { useFilteredMembers } from "./hooks/useFilteredMembers";

export default function MemberList(): JSX.Element {
  // Dobavi članove pomoću custom hooka
  const {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    refreshMembers
  } = useMemberData();

  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Stil za printanje direktno u komponenti
  useEffect(() => {
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        /* Sakrivanje svih nepotrebnih elemenata za print */
        .print\\:hidden,
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
        .print\\:table,
        .print\\:!table {
          display: table !important;
        }

        /* Osiguravanje da je header za printanje vidljiv */
        .print\\:block,
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

  // Modalni prozori - stanja
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [assigningPasswordMember, setAssigningPasswordMember] = useState<Member | null>(null);
  const [roleAssignmentMember, setRoleAssignmentMember] = useState<Member | null>(null);

  // Check if user has admin privileges (for editing, deleting, adding members)
  const isAdmin = user?.role === "admin" || user?.role === "superuser";
  const isSuperuser = user?.role === "superuser";

  // Stanja za filtriranje i sortiranje
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "passive" | "paid" | "unpaid">("active");
  const [ageFilter, setAgeFilter] = useState<"all" | "adults">("all");
  const [sortCriteria, setSortCriteria] = useState<"name" | "hours">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupByType, setGroupByType] = useState<boolean>(false);
  const [showOnlyColored, setShowOnlyColored] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false); // Stanje za prikaz/skrivanje filtera
  const [showNavTabs, setShowNavTabs] = useState<boolean>(true); // Stanje za prikaz/skrivanje navigacijskih tabova - vidljivo na desktop, ali ne na mobile
  const [refreshing, setRefreshing] = useState(false); // Stanje za pull-to-refresh
  const [touchStartY, setTouchStartY] = useState(0); // Za praćenje swipe geste
  const [isMobile, setIsMobile] = useState(false);

  // Koristimo custom hook za filtriranje i sortiranje
  const { filteredMembers: filteredMembersRaw } = useFilteredMembers({
    members,
    searchTerm,
    activeFilter,
    ageFilter,
    sortCriteria,
    sortOrder,
    groupByType
  });

  const [filteredMembers, setFilteredMembers] = useState<{
    key: string;
    title: string;
    members: MemberWithDetails[];
  }[]>([]);

  useEffect(() => {
    // Ova funkcija se poziva kad se promijeni groupByType ili filteredMembersRaw
    const groupedMembers = groupMembers(filteredMembersRaw);
    setFilteredMembers(groupedMembers);
  }, [filteredMembersRaw, groupByType, showOnlyColored]);

  useEffect(() => {
    if (showOnlyColored) {
      const updatedMembers = filteredMembers.map(group => ({
        ...group,
        members: filterOnlyColoredRows(group.members)
      }));
      setFilteredMembers(updatedMembers);
    }
  }, [showOnlyColored]);

  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Na većim ekranima uvijek prikazuj tabove
      if (!mobile) {
        setShowNavTabs(true);
      }
      // Na mobilnim sakrivamo default
      else if (mobile && showNavTabs === true) {
        setShowNavTabs(false);
      }
    };
    
    // Inicijalna provjera
    checkIsMobile();
    
    // Slušaj promjene veličine prozora
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [showNavTabs]);

  useEffect(() => {
    // Dodajemo stil za ispis
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        /* Sakrivamo sve što ne treba biti na ispisu */
        header, nav, .logo-container, button, .navigation-menu, .primary-navigation,
        .print\\:hidden, #global-header, .items-center.gap-2, .amber-50, 
        [aria-label="filters"], [class*="Pronađeno"], .flex.items-center.bg-amber-50 {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Čišćenje pri unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Metoda za grupiranje članova - ovo će zadržati strukturu potrebnu za MemberTable
  function groupMembers(memberList: MemberWithDetails[]): {
    key: string;
    title: string;
    members: MemberWithDetails[];
  }[] {
    if (groupByType) {
      // Grupiraj po životnom statusu ako je uključeno
      const groups: Record<string, MemberWithDetails[]> = {};
      
      memberList.forEach(member => {
        const status = member.life_status || 'unknown';
        if (!groups[status]) {
          groups[status] = [];
        }
        groups[status].push(member);
      });
      
      return Object.entries(groups).map(([status, members]) => ({
        key: status,
        title: status.charAt(0).toUpperCase() + status.slice(1),
        members
      }));
    } else {
      // Bez grupiranja - vrati sve u jednoj grupi
      return [{
        key: 'all',
        title: 'All Members',
        members: memberList
      }];
    }
  }

  // Metode za upravljanje članovima
  const handleAddMember = async (newMember: Member) => {
    const success = await addMember(newMember);
    if (success) {
      setShowAddForm(false);
    }
  };

  const handleEdit = (member: Member) => {
    navigate(`/members/${String(member.member_id)}`);
  };

  const handleEditMember = async (updatedMember: Member) => {
    const success = await updateMember(String(updatedMember.member_id), updatedMember);
    if (success) {
      setEditingMember(null);
    }
  };

  const handleDeleteMember = async () => {
    if (deletingMember) {
      const success = await deleteMember(String(deletingMember.member_id));
      if (success) {
        setDeletingMember(null);
      }
    }
  };

  // Rukovatelji za dodjelu zaporke i uloge
  const handleAssignPassword = (member: Member, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAssigningPasswordMember(member);
  };

  const handleOpenRoleAssignment = (member: Member, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRoleAssignmentMember(member);
  };

  // Funkcija za ispis
  const handlePrint = () => {
    window.print();
  };

  const handleToggleColoredRows = () => {
    if (showOnlyColored) {
      // Ako već prikazujemo samo obojane, vrati sve članove
      setShowOnlyColored(false);
    } else {
      // Inače, filtriraj i prikaži samo obojane
      setShowOnlyColored(true);
    }
  };

  // Funkcija za pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;
    
    // Ako je korisnik povukao dovoljno prema dolje i nije već u procesu osvježavanja
    if (diff > 100 && !refreshing && window.scrollY === 0) {
      setRefreshing(true);
      
      // Osvježi podatke
      refreshMembers();
      
      // Postavi timer za resetiranje stanja nakon osvježavanja
      setTimeout(() => {
        setRefreshing(false);
      }, 1000); // Kratka odgoda za bolji UX
    }
  };
  
  // Funkcija za swipe za prikaz/skrivanje navigacijskih tabova
  const handleSwipeForNav = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const touchEndY = touchY;
    const diff = touchEndY - touchStartY;
    
    // Ako je swipe prema dolje i tabs nisu vidljivi
    if (diff > 50 && !showNavTabs) {
      setShowNavTabs(true);
    } 
    // Ako je swipe prema gore i tabs su vidljivi
    else if (diff < -50 && showNavTabs) {
      setShowNavTabs(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 border-b border-gray-200" onTouchStart={handleTouchStart} onTouchMove={(e) => {
        handleTouchMove(e);
        handleSwipeForNav(e);
      }}>
      {/* Print-only header */}
      <div className="hidden print:block print:!block text-center pb-6 border-b-2 border-gray-300 mb-6" style={{pageBreakInside: 'avoid'}} id="print-header">
        <h1 className="text-2xl font-bold mb-2">Planinarsko društvo "Promina" Drniš</h1>
        <h2 className="text-xl font-semibold mb-3">Upisna lista članova</h2>
        <div className="text-lg font-semibold bg-blue-100 border-2 border-blue-300 inline-block px-6 py-2 mb-2 mt-2 rounded-md">
          Ukupno članova: <span className="text-xl">{filteredMembers.reduce((count, group) => count + group.members.length, 0)}</span>
        </div>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <div className="border rounded-md px-3 py-1 bg-gray-50">
            Aktivni: <span className="font-semibold">{members.filter(m => m.isActive).length}</span>
          </div>
          <div className="border rounded-md px-3 py-1 bg-gray-50">
            Neaktivni: <span className="font-semibold">{members.filter(m => !m.isActive).length}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-3">
          Generirano: {formatDate(getCurrentDate(), 'dd.MM.yyyy HH:mm')}
        </div>
      </div>

      {/* Prikaz greške ako postoji */}
      {error && (
        <Alert variant="destructive" className="mb-4 print:hidden">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-8 print:hidden">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                      <span className="hidden md:inline">Lista članova</span>
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="flex items-center">
                      <BarChart className="w-4 h-4 mr-2" />
                      <span className="hidden md:inline">Statistika</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Desna strana - ostali gumbi */}
                <div className="flex items-center gap-2 flex-wrap print:hidden">
                  {/* Brojač članova */}
                  <div className="flex items-center bg-amber-50 border border-amber-200 rounded-md px-3 py-1">
                    <span className="text-sm font-medium text-gray-500 mr-1 hidden md:inline">Pronađeno:</span>
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
                    <span className="hidden md:inline">Filteri</span>
                    {showFilters ? 
                      <ChevronUp className="w-4 h-4 hidden md:inline md:ml-1" /> : 
                      <ChevronDown className="w-4 h-4 hidden md:inline md:ml-1" />
                    }
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 hidden md:flex"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 md:mr-1" />
                    <span className="hidden md:inline">Print List</span>
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-black text-white"
                      onClick={() => setShowAddForm(true)}
                    >
                      <UserPlus className="w-4 h-4 md:mr-1" />
                      <span className="hidden md:inline">Add Member</span>
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="p-3 border-b border-gray-200 print:hidden">
                {showFilters && (
                  <MemberListFilters
                    searchTerm={searchTerm}
                    onSearchChange={(value: string) => setSearchTerm(value)}
                    activeFilter={activeFilter}
                    onActiveFilterChange={(value: string) => setActiveFilter(value as "all" | "active" | "passive" | "paid" | "unpaid")}
                    ageFilter={ageFilter}
                    onAgeFilterChange={(value: string) => setAgeFilter(value as "all" | "adults")}
                    sortCriteria={sortCriteria}
                    onSortCriteriaChange={(value: string) => setSortCriteria(value as "name" | "hours")}
                    sortOrder={sortOrder}
                    onSortOrderChange={(value: string) => setSortOrder(value as "asc" | "desc")}
                    groupType={groupByType ? "true" : ""}
                    onGroupTypeChange={(value) => setGroupByType(!!value)}
                    onToggleColoredRows={handleToggleColoredRows} 
                    showOnlyColored={showOnlyColored}
                    onCloseFilters={() => setShowFilters(false)}
                  />
                )}
                
                {/* Uklonjen brojač s ovog mjesta jer je premješten na vrh */}
              </div>
            </div>
            
            {/* Ovdje je tablica s članovima */}
            <TabsContent value="list" className="flex-grow overflow-hidden flex flex-col">
              {/* Skrolabilna tablica članova */}
              <div ref={printRef} className="overflow-auto flex-grow">
                <MemberTable 
                  filteredMembers={filteredMembers} 
                  isAdmin={isAdmin}
                  isSuperuser={isSuperuser}
                  onViewDetails={(memberId) => navigate(`/members/${memberId}`)}
                  onEditMember={setEditingMember}
                  onDeleteMember={setDeletingMember}
                  onAssignPassword={setAssigningPasswordMember}
                  onAssignRole={setRoleAssignmentMember}
                  setFilteredMembers={setFilteredMembers}
                  refreshMembers={refreshMembers}
                  hideTableHeader={false} // Prikazujemo zaglavlje tablice jer smo uklonili fiksirani header
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
          onAdd={handleAddMember}
        />
      )}

      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onEdit={handleEditMember}
        />
      )}

      {deletingMember && (
        <ConfirmationModal
          message={`Jeste li sigurni da želite obrisati člana ${deletingMember.first_name} ${deletingMember.last_name}?`}
          onConfirm={handleDeleteMember}
          onCancel={() => setDeletingMember(null)}
        />
      )}

      {assigningPasswordMember && (
        <AssignCardNumberForm
          member={assigningPasswordMember}
          onClose={() => setAssigningPasswordMember(null)}
          onAssign={() => refreshMembers()}
        />
      )}

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
