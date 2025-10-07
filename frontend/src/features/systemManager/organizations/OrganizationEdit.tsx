// frontend/src/features/systemManager/organizations/OrganizationEdit.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { 
  getOrganizationById,
  updateOrganization,
  type Organization,
  type UpdateOrganizationData 
} from '../../../utils/api/apiOrganizations';
import { IMAGE_BASE_URL } from '../../../utils/config';

const OrganizationEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<UpdateOrganizationData>({
    name: '',
    short_name: '',
    email: '',
    phone: '',
    website_url: '',
    primary_color: '#2563eb',
    secondary_color: '#64748b',
    sm_username: '',
    sm_email: '',
    sm_display_name: '',
    sm_password: '', // Ostavi prazno - mijenja se samo ako se unese nova lozinka
  });

  const loadOrganization = useCallback(async (): Promise<void> => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getOrganizationById(parseInt(id));
      setOrganization(data.organization);
      // Dodaj IMAGE_BASE_URL ako je relativna putanja
      const logoPath = data.organization.logo_path;
      if (logoPath) {
        setLogoPreview(logoPath.startsWith('http') ? logoPath : `${IMAGE_BASE_URL}${logoPath.replace('/uploads', '')}`);
      }
      setFormData({
        name: data.organization.name,
        short_name: data.organization.short_name ?? '',
        email: data.organization.email,
        phone: data.organization.phone ?? '',
        website_url: data.organization.website_url ?? '',
        primary_color: data.organization.primary_color ?? '#2563eb',
        secondary_color: data.organization.secondary_color ?? '#64748b',
        sm_username: data.organization.system_manager?.username ?? '',
        sm_email: data.organization.system_manager?.email ?? '',
        sm_display_name: data.organization.system_manager?.display_name ?? '',
        sm_password: '', // Ne učitavaj lozinku
      });
    } catch (err) {
      console.error('Error loading organization:', err);
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrganization();
  }, [loadOrganization]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      setError(null);
      
      // Prvo upload-aj logo ako je odabran
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('logo', logoFile);
        
        const response = await fetch(`http://localhost:3000/api/system-manager/organizations/${id}/logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`,
          },
          body: logoFormData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload logo');
        }
      }
      
      // Zatim ažuriraj ostale podatke
      await updateOrganization(parseInt(id), formData);
      navigate('/system-manager/organizations');
    } catch (err) {
      console.error('Error updating organization:', err);
      setError('Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateOrganizationData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = (): void => {
    setLogoFile(null);
    setLogoPreview(null);
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

  if (!organization) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Organization not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/system-manager/organizations')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organizations
        </Button>
        <h1 className="text-3xl font-bold">Edit Organization</h1>
        <p className="text-gray-600 mt-1">Update organization details</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={(e) => { 
        e.preventDefault();
        void handleSubmit(e); 
      }}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div>
              <Label>Organization Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload PNG, JPG or SVG (max 2MB)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="short_name">Short Name</Label>
              <Input
                id="short_name"
                value={formData.short_name}
                onChange={(e) => handleChange('short_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* System Manager Section */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">System Manager</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sm_username">Username</Label>
                  <Input
                    id="sm_username"
                    value={formData.sm_username}
                    onChange={(e) => handleChange('sm_username', e.target.value)}
                    placeholder="admin_username"
                  />
                </div>

                <div>
                  <Label htmlFor="sm_email">Email</Label>
                  <Input
                    id="sm_email"
                    type="email"
                    value={formData.sm_email}
                    onChange={(e) => handleChange('sm_email', e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="sm_display_name">Display Name</Label>
                  <Input
                    id="sm_display_name"
                    value={formData.sm_display_name}
                    onChange={(e) => handleChange('sm_display_name', e.target.value)}
                    placeholder="Admin Name"
                  />
                </div>

                <div>
                  <Label htmlFor="sm_password">New Password (leave empty to keep current)</Label>
                  <Input
                    id="sm_password"
                    type="password"
                    value={formData.sm_password}
                    onChange={(e) => handleChange('sm_password', e.target.value)}
                    placeholder="Enter new password to change"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Only fill this if you want to change the password
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/system-manager/organizations')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default OrganizationEdit;
