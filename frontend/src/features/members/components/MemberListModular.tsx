import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  UserPlus,
  Printer
} from "lucide-react";
import { Alert, AlertDescription } from "@/../components/ui/alert.js";
import { Member } from "@shared/member";
import AddMemberForm from "../AddMemberForm";
import EditMemberForm from "@components/EditMemberForm";
import ConfirmationModal from "@components/ConfirmationModal";
import AssignCardNumberForm from "@components/AssignCardNumberForm";
import RoleAssignmentModal from "../RoleAssignmentModal";
import { Button } from "@components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { formatDate, getCurrentDate } from "../../../utils/dateUtils";

// Uvoz custom hooka za dohvat podataka o članovima
import { useMemberData } from "../hooks/useMemberData";
// Uvoz komponente za filtriranje
import { MemberListFilters } from "./MemberListFilters";
// Uvoz komponente za prikaz tablice
import { MemberTable } from "./MemberTable";
// Uvoz komponente za prikaz statistike
import { StatisticsView } from "./StatisticsView";
// Uvoz custom hooka za filtriranje i sortiranje
import { useFilteredMembers } from "../hooks/useFilteredMembers";

export default function MemberListModular(): JSX.Element {
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
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "passive">("active");
  const [ageFilter, setAgeFilter] = useState<"all" | "adults">("all");
  const [sortCriteria, setSortCriteria] = useState<"name" | "hours">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupByType, setGroupByType] = useState<boolean>(false);

  // Koristimo custom hook za filtriranje i sortiranje
  const { filteredMembers } = useFilteredMembers({
    members,
    searchTerm,
    activeFilter,
    ageFilter,
    sortCriteria,
    sortOrder,
    groupByType
  });

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

  // Grupiranje članova
  const groupsToRender = () => {
    if (!groupByType) {
      return [{ key: "all", title: "All Members", members: filteredMembers }];
    }

    // Grupiraj po life_status kategorijama
    const employedGroup = filteredMembers.filter(
      (m) => m.life_status === "employed/unemployed"
    );
    const studentGroup = filteredMembers.filter(
      (m) => m.life_status === "child/pupil/student"
    );
    const pensionerGroup = filteredMembers.filter(
      (m) => m.life_status === "pensioner"
    );
    const otherGroup = filteredMembers.filter(
      (m) =>
        m.life_status !== "employed/unemployed" &&
        m.life_status !== "child/pupil/student" &&
        m.life_status !== "pensioner"
    );

    return [
      {
        key: "employed",
        title: "Employed/Unemployed",
        members: employedGroup,
      },
      { key: "student", title: "Students/Pupils", members: studentGroup },
      { key: "pensioner", title: "Pensioners", members: pensionerGroup },
      { key: "other", title: "Other", members: otherGroup },
    ].filter(group => group.members.length > 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Print-only header */}
      <div className="hidden print:block print:!block text-center pb-6 border-b-2 border-gray-300 mb-6" style={{display: 'none', pageBreakInside: 'avoid'}} id="print-header">
        <h1 className="text-2xl font-bold mb-2">Member List - Promina Drnis</h1>
        <div className="text-lg font-semibold bg-blue-100 border-2 border-blue-300 inline-block px-6 py-2 mb-2 mt-2 rounded-md">
          Total members: <span className="text-xl">{filteredMembers.length}</span>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Generated: {formatDate(getCurrentDate(), 'dd.MM.yyyy HH:mm')}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member List</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1"
          >
            <Printer className="w-4 h-4" />
            Print List
          </Button>
          {isAdmin && (
            <Button
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => setShowAddForm(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Prikaz greške ako postoji */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Tabs for List and Statistics */}
      {!loading && (
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Lista članova</TabsTrigger>
            <TabsTrigger value="statistics">Statistika</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
              <div className="p-4 border-b">
                <MemberListFilters
                  searchTerm={searchTerm}
                  onSearchChange={(value) => setSearchTerm(value)}
                  activeFilter={activeFilter}
                  onActiveFilterChange={(value) => setActiveFilter(value as "all" | "active" | "passive")}
                  ageFilter={ageFilter}
                  onAgeFilterChange={(value) => setAgeFilter(value as "all" | "adults")}
                  sortCriteria={sortCriteria}
                  onSortCriteriaChange={(value) => setSortCriteria(value as "name" | "hours")}
                  sortOrder={sortOrder}
                  onSortOrderChange={(value) => setSortOrder(value as "asc" | "desc")}
                  groupType={groupByType ? "true" : ""}
                  onGroupTypeChange={(value) => setGroupByType(!!value)}
                />
                <div className="mt-4 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-base text-blue-800 mr-2 font-medium shadow-sm inline-block">
                  {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
                </div>
              </div>
              
              <div ref={printRef} className="overflow-x-auto">
                <MemberTable 
                  filteredMembers={groupsToRender()} 
                  isAdmin={isAdmin}
                  isSuperuser={isSuperuser}
                  onViewDetails={(memberId) => navigate(`/members/${memberId}`)}
                  onEditMember={setEditingMember}
                  onDeleteMember={setDeletingMember}
                  onAssignPassword={setAssigningPasswordMember}
                  onAssignRole={setRoleAssignmentMember}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics">
            <StatisticsView members={members} />
          </TabsContent>
        </Tabs>
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
