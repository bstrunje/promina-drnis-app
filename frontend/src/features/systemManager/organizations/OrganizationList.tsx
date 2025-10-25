// frontend/src/features/systemManager/organizations/OrganizationList.tsx
import React, { useState, useEffect } from 'react';
import { useSystemManagerNavigation } from '../hooks/useSystemManagerNavigation';
import { Plus, Building2, Users, Activity, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@components/ui/tooltip';
import { 
  getAllOrganizations, 
  deleteOrganization,
  type Organization 
} from '../../../utils/api/apiOrganizations';
import { IMAGE_BASE_URL } from '../../../utils/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import ManagerHeader from '../components/common/ManagerHeader';
import { useSystemManager } from '../../../context/SystemManagerContext';

interface OrganizationListProps {
  standalone?: boolean; // Ako je false, ne prikazuje vlastiti header/wrapper
}

const OrganizationList: React.FC<OrganizationListProps> = ({ standalone = true }) => {
  const { navigateTo } = useSystemManagerNavigation();
  const { manager } = useSystemManager();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadOrganizations();
  }, []);

  const loadOrganizations = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllOrganizations();
      setOrganizations(data.organizations);
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!organizationToDelete) return;

    try {
      setDeleting(true);
      await deleteOrganization(organizationToDelete.id);
      setDeleteDialogOpen(false);
      setOrganizationToDelete(null);
      void loadOrganizations(); // Reload list
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError('Failed to delete organization. It may have members or other dependencies.');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (org: Organization): void => {
    setOrganizationToDelete(org);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className="p-4 sm:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Organizations</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage all organizations in the system</p>
            </div>
            <Button 
              onClick={() => navigateTo('/system-manager/organizations/create')}
              className="w-full sm:w-auto"
            >
              {/* Gumb za kreiranje organizacije */}
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first organization</p>
            <Button onClick={() => navigateTo('/system-manager/organizations/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {org.logo_path ? (
                      <img 
                        src={org.logo_path.startsWith('http') ? org.logo_path : `${IMAGE_BASE_URL}${org.logo_path.replace('/uploads', '')}`}
                        alt={org.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div 
                        className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: org.primary_color }}
                      >
                        {org.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <p className="text-sm text-gray-500">{org.subdomain}.managemembers.vercel.app</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    org.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {org.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{(org._count?.members ?? 0)} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span>{(org._count?.activities ?? 0)} activities</span>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="text-sm text-gray-600">
                    <p>{org.email}</p>
                    {org.phone && <p>{org.phone}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigateTo(`/system-manager/organizations/${org.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit organization details</p>
                      </TooltipContent>
                    </Tooltip>
                    {org.website_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { if (org.website_url) window.open(org.website_url, '_blank'); }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visit organization website</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(org)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete organization</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Organization</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{organizationToDelete?.name}</strong>?
                This action cannot be undone and will delete all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );

  // Ako je standalone, wrapaj s header i full layout
  if (standalone) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gray-100">
          <ManagerHeader manager={manager} />
          {content}
        </div>
      </TooltipProvider>
    );
  }

  // Ako nije standalone, vrati samo sadržaj (bez full-screen wrappera)
  return <TooltipProvider>{content}</TooltipProvider>;
};

export default OrganizationList;
