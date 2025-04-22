import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  Key,
  UserCog,
  SortAsc,
  SortDesc,
  Filter,
  Printer,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "@/../components/ui/alert.js";
import { Member } from "@shared/member";
import AddMemberForm from "./AddMemberForm";
import EditMemberForm from "../../../components/EditMemberForm";
import ConfirmationModal from "../../../components/ConfirmationModal";
import AssignCardNumberForm from "@components/AssignCardNumberForm";
import RoleAssignmentModal from "./RoleAssignmentModal";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useToast } from "@components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/../components/ui/select";
import { Input } from "@/../components/ui/input";
import { Button } from "@/../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/../components/ui/tabs";
import { Badge } from "@/../components/ui/badge";
import { formatDate, getCurrentDate, getCurrentYear, getMonth, getDate } from "../../utils/dateUtils";
import { parseISO } from "date-fns";

// New interface for member's card and stamp details
interface MemberCardDetails {
  card_number?: string;
  stamp_type?: "employed" | "student" | "pensioner";
  fee_payment_year?: number;
  has_stamp?: boolean;
  card_stamp_issued?: boolean;
}

interface MemberWithDetails extends Member {
  cardDetails?: MemberCardDetails;
  isActive?: boolean;
  // Dodajemo property za prikaz statusa članstva
  membershipStatus?: 'registered' | 'inactive' | 'pending';
}

export default function MemberList(): JSX.Element {
  const { toast } = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [assigningPasswordMember, setAssigningPasswordMember] = useState<Member | null>(null);
  const [roleAssignmentMember, setRoleAssignmentMember] = useState<Member | null>(null);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Check if user has admin privileges (for editing, deleting, adding members)
  const isAdmin = user?.role === "admin" || user?.role === "superuser";
  const isSuperuser = user?.role === "superuser";
  
  // State for sorting and filtering
  const [sortCriteria, setSortCriteria] = useState<"name" | "hours">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "passive">("all");
  const [ageFilter, setAgeFilter] = useState<"all" | "adults">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByType, setGroupByType] = useState<boolean>(false);

  useEffect(() => {
    const fetchMembers = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await api.get<Member[]>("/members");
        const membersData = response.data;

        // Koristi podatke koji su već dostupni u osnovnim podacima o članu
        const membersWithDetails = membersData.map(member => {
          const isActive = Number(member.total_hours) >= 20;
          
          return {
            ...member,
            cardDetails: {
              card_number: member.card_number || member.membership_details?.card_number,
              stamp_type: member.life_status as any, // Koristi life_status kao tip markice
              card_stamp_issued: false, // Default value, will be updated later
              fee_payment_year: member.fee_payment_year || member.membership_details?.fee_payment_year
            },
            isActive,
            membershipStatus: 'registered' as 'registered' | 'inactive' | 'pending'
          };
        });

        setMembers(membersWithDetails);
        setFilteredMembers(membersWithDetails);
        setError(null);
        
        // Now fetch detailed membership information for each member
        const fetchMembershipDetails = async () => {
          const detailedMembers = [...membersWithDetails] as MemberWithDetails[];
          
          for (const member of detailedMembers) {
            try {
              // Use the standard member endpoint instead of the details endpoint
              const response = await api.get(`/members/${member.member_id}`);
              const details = response.data;
              
              // Update the member with detailed info
              if (details && details.membership_details) {
                member.cardDetails.card_stamp_issued = details.membership_details.card_stamp_issued === true;
                member.cardDetails.card_number = details.membership_details.card_number || member.cardDetails.card_number;
                member.cardDetails.fee_payment_year = details.membership_details.fee_payment_year || member.cardDetails.fee_payment_year;
                
                // Dodaj status članstva iz detalja člana
                member.membershipStatus = (details.status || 'registered') as 'registered' | 'inactive' | 'pending';
                
                // Log za dijagnostiku
                console.log(`Member ${member.member_id} (${member.full_name}) - Status: ${member.membershipStatus}`);
              }
            } catch (error) {
              console.error(`Error fetching details for member ${member.member_id}:`, error);
            }
          }
          
          // Update state with detailed info
          setMembers([...detailedMembers] as MemberWithDetails[]);
          setFilteredMembers([...detailedMembers] as MemberWithDetails[]);
        };
        
        fetchMembershipDetails();
      } catch (error) {
        console.error("Error fetching members:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load members"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...members];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(member => 
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.oib?.includes(searchTerm)
      );
    }
    
    // Apply active/passive filter
    if (activeFilter !== "all") {
      const isActive = activeFilter === "active";
      result = result.filter(member => member.isActive === isActive);
    }
    
    // Apply age filter - samo punoljetni (18+)
    if (ageFilter === "adults") {
      const today = getCurrentDate();
      result = result.filter(member => {
        // Provjeri da li datum rođenja postoji
        if (!member.date_of_birth) return false;
        
        // Pretvori string datuma u Date objekt
        const birthDate = parseISO(member.date_of_birth);
        
        // Izračunaj dob u godinama
        let age = getCurrentYear() - birthDate.getFullYear();
        const monthDiff = getMonth(today) - getMonth(birthDate);
        
        // Prilagodi dob ako rođendan još nije prošao ove godine
        if (monthDiff < 0 || (monthDiff === 0 && getDate(today) < getDate(birthDate))) {
          age--;
        }
        
        // Vrati true za punoljetne (18 ili više godina)
        return age >= 18;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortCriteria === "name") {
        return sortOrder === "asc"
          ? (a.full_name || "").localeCompare(b.full_name || "")
          : (b.full_name || "").localeCompare(a.full_name || "");
      } else {
        // Sort by hours
        const aHours = Number(a.total_hours) || 0;
        const bHours = Number(b.total_hours) || 0;
        return sortOrder === "asc" ? aHours - bHours : bHours - aHours;
      }
    });
    
    setFilteredMembers(result);
  }, [members, sortCriteria, sortOrder, activeFilter, ageFilter, searchTerm]);

  const getLifeStatusColor = (member: MemberWithDetails) => {
    // Provjeri prvo je li markica izdana
    const stampIssued = member.cardDetails?.card_stamp_issued;
    
    // Ako markica nije izdana, samo hover efekt bez bojanja
    if (!stampIssued) {
      return "hover:bg-gray-50";
    }
    
    // Inače, oboji ovisno o life_status
    const lifeStatus = member.life_status;
    
    switch (lifeStatus) {
      case "employed/unemployed":
        return "bg-blue-50 hover:bg-blue-100";
      case "child/pupil/student":
        return "bg-green-50 hover:bg-green-100";
      case "pensioner":
        return "bg-red-50 hover:bg-red-100";
      default:
        return "hover:bg-gray-50";
    }
  };

  const getRegistrationStatusColor = (isRegistered: boolean) => {
    if (!isRegistered) return "bg-yellow-100 text-yellow-800"; // pending
    return "bg-green-100 text-green-800"; // completed
  };

  const getMembershipStatusColor = (status?: string) => {
    switch (status) {
      case 'inactive':
        return "bg-red-100 text-red-800";
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'registered':
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getActivityStatusBadge = (isActive: boolean | undefined) => {
    if (isActive === undefined) return null;
    
    return isActive ? (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Passive
      </Badge>
    );
  };

  const handleAssignPassword = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningPasswordMember(member);
  };

  const handleAdd = async (newMember: Member) => {
    try {
      const response = await api.post("/members", newMember);
      const memberWithDefaults = {
        ...response.data,
        total_hours: response.data.total_hours || 0,
        isActive: false
      };
      setMembers([...members, memberWithDefaults]);
      setShowAddForm(false);
      toast({
        title: "Success",
        description: "Member added successfully",
        variant: "success",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add member");
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (member: Member) => {
    // Koristi različite rute ovisno o ulozi korisnika
    if (isAdmin) {
      // Za admine i superusere, omogući uređivanje
      navigate(`/members/${member.member_id}/edit`);
    } else {
      // Za obične članove, samo pregled
      navigate(`/members/${member.member_id}`);
    }
  };

  const handleDelete = async (memberId: number, e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation();
    
    try {
      await api.delete(`/members/${memberId}`);

      setMembers((prev) => prev.filter((m) => m.member_id !== memberId));
      setDeletingMember(null);

      toast({
        title: "Success",
        description: "Member deleted successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Delete error details:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete member"
      );
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
    }
  };

  const handleRoleAssignment = async (
    memberId: number,
    newRole: "member" | "admin" | "superuser",
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    
    try {
      await api.put(`/members/${memberId}/role`, { role: newRole });

      setMembers(
        members.map((m) =>
          m.member_id === memberId ? { ...m, role: newRole } : m
        )
      );
      setRoleAssignmentMember(null);
      toast({
        title: "Success",
        description: "Role updated successfully",
        variant: "success",
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update member role"
      );
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleOpenRoleAssignment = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleAssignmentMember(member);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive",
      });
      return;
    }
    
    // Pripremi sadržaj za printanje
    const membersToDisplay = filteredMembers;
    const totalMembers = membersToDisplay.length;
    
    // Generiraj opis filtera koji su primijenjeni
    let filterDescription = '';
    
    if (searchTerm) {
      filterDescription += `Search: "${searchTerm}" `;
    }
    
    if (activeFilter !== 'all') {
      filterDescription += `Status: ${activeFilter} `;
    }
    
    if (ageFilter !== 'all') {
      filterDescription += `Age: ${ageFilter === 'adults' ? 'Assembly members' : ageFilter} `;
    }
    
    if (sortCriteria) {
      filterDescription += `Sorted by: ${sortCriteria} (${sortOrder}) `;
    }
    
    // Ako je prikaz grupiran, dodaj i tu informaciju
    if (groupByType) {
      filterDescription += `Grouped by type `;
    }
    
    // Pripremi naslov za ispis
    const titleText = filterDescription 
      ? `Member List (${filterDescription.trim()})` 
      : 'Complete Member List';
    
    // Pripremi tekst o ukupnom broju članova
    const totalText = filterDescription 
      ? `Filtered members: ${totalMembers}` 
      : `Total members: ${totalMembers}`;
    
    const printContent = `
      <html>
        <head>
          <title>Member List - Promina Drnis</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .member-count { 
              background-color: #dbeafe; 
              border: 3px solid #3b82f6; 
              padding: 10px 20px;
              font-size: 18px;
              font-weight: bold;
              display: inline-block;
              margin: 20px auto;
              border-radius: 6px;
            }
            .filter-info {
              font-size: 14px;
              color: #4b5563;
              margin: 10px 0;
              font-style: italic;
            }
            .date { text-align: right; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { 
              background-color: #f3f4f6; 
              padding: 10px; 
              text-align: left; 
              font-weight: bold;
              border-bottom: 2px solid #d1d5db;
            }
            td { 
              padding: 10px; 
              border-bottom: 1px solid #e5e7eb; 
            }
            tr:nth-child(even) { background-color: #f9fafb; }
            .employed { background-color: #e6f0ff; }
            .student { background-color: #e6ffe6; }
            .pensioner { background-color: #ffe6e6; }
            .active { color: #047857; font-weight: bold; }
            .passive { color: #b45309; }
            @media print {
              .member-count { 
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Member List - Promina Drnis</h1>
            
            <div class="member-count">
              ${totalText}
            </div>
            
            ${filterDescription ? `<div class="filter-info">Filters applied: ${filterDescription}</div>` : ''}
            
            <div class="date">Generated on: ${formatDate(getCurrentDate(), 'dd.MM.yyyy HH:mm')}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Hours</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              ${membersToDisplay.map(member => {
                const stampType = member.cardDetails?.stamp_type || member.life_status;
                let statusClass = '';
                if (stampType === 'employed' || stampType === 'employed/unemployed') statusClass = 'employed';
                else if (stampType === 'student' || stampType === 'child/pupil/student') statusClass = 'student';
                else if (stampType === 'pensioner') statusClass = 'pensioner';
                
                const activityClass = member.isActive ? 'active' : 'passive';
                
                return `
                  <tr class="${statusClass}">
                    <td>${member.full_name || `${member.first_name} ${member.last_name}`}</td>
                    <td>${member.registration_completed ? 'Registered' : 'Pending'}</td>
                    <td>${member.total_hours || 0}</td>
                    <td class="${activityClass}">${member.isActive ? 'Active' : 'Passive'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print(); return false;" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              Print this page
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Automatski fokusiraj i pokreni ispis kada se stranica učita
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  };

  // Group members by life status / stamp type
  const groupedMembers = () => {
    if (!groupByType) return { all: filteredMembers };
    
    return filteredMembers.reduce((acc, member) => {
      const type = member.cardDetails?.stamp_type || member.life_status || 'unknown';
      let groupKey = 'unknown';
      
      if (type === 'employed' || type === 'employed/unemployed') groupKey = 'employed';
      else if (type === 'student' || type === 'child/pupil/student') groupKey = 'student';
      else if (type === 'pensioner') groupKey = 'pensioner';
      
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(member);
      return acc;
    }, {} as Record<string, MemberWithDetails[]>);
  };

  // Convert grouped members to array for rendering
  const groupsToRender = () => {
    const groups = groupedMembers();
    if (!groupByType) return [{ key: 'all', title: 'All Members', members: groups.all }];
    
    return [
      { key: 'employed', title: 'Employed/Unemployed', members: groups.employed || [] },
      { key: 'student', title: 'Students', members: groups.student || [] },
      { key: 'pensioner', title: 'Pensioners', members: groups.pensioner || [] },
      { key: 'unknown', title: 'Others', members: groups.unknown || [] }
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
        <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
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
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or OIB..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-base text-blue-800 mr-2 font-medium shadow-sm">
                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
              </div>
              <Select value={activeFilter} onValueChange={(value: any) => setActiveFilter(value)}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="passive">Passive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={ageFilter} onValueChange={(value: any) => setAgeFilter(value)}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Age Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="adults">Assembly members</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortCriteria} onValueChange={(value: any) => setSortCriteria(value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
              >
                {sortOrder === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant={groupByType ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupByType(!groupByType)}
                title={groupByType ? "Disable grouping" : "Group by member type"}
              >
                Group by Type
              </Button>
            </div>
          </div>
        </div>
        
        <div ref={printRef} className="overflow-x-auto">
          {groupsToRender().map(group => (
            <div key={group.key} className="mb-4">
              {groupByType && (
                <div className="px-6 py-3 bg-gray-100 font-medium">
                  {group.title} ({group.members.length})
                </div>
              )}
              
              <table className="w-full text-left">
                {(!groupByType || group.key === groupsToRender()[0].key) && (
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-200">
                  {group.members.map((member: MemberWithDetails) => (
                    <tr 
                      key={member.member_id} 
                      className={`${getLifeStatusColor(member)} cursor-pointer transition-colors`}
                      onClick={() => handleEdit(member)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${getMembershipStatusColor(member.membershipStatus)}`}
                        >
                          {member.membershipStatus === 'registered' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          {member.membershipStatus === 'registered' ? "Registered" : member.membershipStatus === 'inactive' ? 'Inactive' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {member.total_hours || 0}
                      </td>
                      <td className="px-6 py-4">
                        {getActivityStatusBadge(member.isActive)}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(member);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isSuperuser && (
                              <>
                                <button
                                  onClick={(e) => handleOpenRoleAssignment(member, e)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Assign Role"
                                >
                                  <UserCog className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingMember(member);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {!member.registration_completed && (
                              <button
                                onClick={(e) => handleAssignPassword(member, e)}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {group.members.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No members found in this group
                </div>
              )}
            </div>
          ))}
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No members found matching your criteria
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <AddMemberForm
          onClose={() => setShowAddForm(false)}
          onAdd={handleAdd}
        />
      )}
      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onEdit={(updatedMember: Member) => {
            setMembers(
              members.map((m) =>
                m.member_id === updatedMember.member_id ? {...updatedMember, isActive: Number(updatedMember.total_hours) >= 20} : m
              )
            );
            setEditingMember(null);
          }}
        />
      )}
      {assigningPasswordMember && (
        <AssignCardNumberForm
          member={assigningPasswordMember}
          onClose={() => setAssigningPasswordMember(null)}
          onAssign={(updatedMember: Member) => {
            setMembers(
              members.map((m) =>
                m.member_id === updatedMember.member_id ? {...updatedMember, isActive: Number(updatedMember.total_hours) >= 20} : m
              )
            );
            setAssigningPasswordMember(null);
          }}
        />
      )}
      {deletingMember && (
        <ConfirmationModal
          message={`Are you sure you want to delete ${deletingMember.first_name} ${deletingMember.last_name}?`}
          onConfirm={() => handleDelete(deletingMember.member_id)}
          onCancel={() => setDeletingMember(null)}
        />
      )}
      {roleAssignmentMember && (
        <RoleAssignmentModal
          member={roleAssignmentMember}
          onClose={() => setRoleAssignmentMember(null)}
          onAssign={handleRoleAssignment}
        />
      )}
    </div>
  );
}
