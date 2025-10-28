// frontend/src/features/systemManager/organizations/OrganizationEdit.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSystemManagerNavigation } from '../hooks/useSystemManagerNavigation';
import { ArrowLeft, Save, Upload, X, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { 
  getOrganizationById,
  updateOrganization,
  resetOrganizationManagerCredentials,
  type Organization,
  type UpdateOrganizationData 
} from '../../../utils/api/apiOrganizations';
import { IMAGE_BASE_URL } from '../../../utils/config';
import { useSystemManager } from '../../../context/SystemManagerContext';
import { getApiBaseUrl } from '../../../utils/tenantUtils';
import systemManagerApi from '../utils/systemManagerApi';

const OrganizationEdit: React.FC = () => {
  const { navigateTo } = useSystemManagerNavigation();
  const { id } = useParams<{ id: string }>();
  const { manager: currentManager } = useSystemManager();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSmPassword, setShowSmPassword] = useState(false); // Prikaz lozinke za System Managera
  const [show2faModal, setShow2faModal] = useState(false);
  const [twoFactorPin, setTwoFactorPin] = useState('');
  const [twoFactorAction, setTwoFactorAction] = useState<'enable' | 'disable'>('enable');
  const [trustedDevicesEnabled, setTrustedDevicesEnabled] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<UpdateOrganizationData>({
    name: '',
    short_name: '',
    email: '',
    phone: '',
    website_url: '',
    // Adresa i lokacija
    street_address: '',
    city: '',
    postal_code: '',
    country: '',
    primary_color: '#2563eb',
    secondary_color: '#e7ecf3',
    default_language: 'hr',
    // Linkovi na dokumente (uređivi)
    ethics_code_url: '',
    privacy_policy_url: '',
    membership_rules_url: '',
    // Aktivnost organizacije
    is_active: undefined,
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
        street_address: data.organization.street_address ?? '',
        city: data.organization.city ?? '',
        postal_code: data.organization.postal_code ?? '',
        country: data.organization.country ?? '',
        primary_color: data.organization.primary_color ?? '#2563eb',
        secondary_color: data.organization.secondary_color ?? '#64748b',
        default_language: data.organization.default_language ?? 'hr',
        ethics_code_url: data.organization.ethics_code_url ?? '',
        privacy_policy_url: data.organization.privacy_policy_url ?? '',
        membership_rules_url: data.organization.membership_rules_url ?? '',
        is_active: data.organization.is_active,
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

  const loadTrustedDevicesSettings = useCallback(async (): Promise<void> => {
    if (!id) return;
    
    try {
      const response = await systemManagerApi.get(`/system-manager/organizations/${id}/trusted-devices-settings`);
      const data = response.data as { enabled?: boolean };
      setTrustedDevicesEnabled(Boolean(data.enabled));
    } catch (err) {
      console.error('Error loading trusted devices settings:', err);
    }
  }, [id]);

  useEffect(() => {
    void loadOrganization();
  }, [loadOrganization]);

  useEffect(() => {
    if (id) {
      void loadTrustedDevicesSettings();
    }
  }, [id, loadTrustedDevicesSettings]);

  const updateTrustedDevicesSettings = async (enabled: boolean): Promise<void> => {
    if (!id) return;
    
    try {
      await systemManagerApi.put(`/system-manager/organizations/${id}/trusted-devices-settings`, { enabled });
      setTrustedDevicesEnabled(enabled);
    } catch (err) {
      console.error('Error updating trusted devices settings:', err);
      setError('Failed to update trusted devices settings');
    }
  };

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
        
        const response = await fetch(`${getApiBaseUrl()}/system-manager/organizations/${id}/logo`, {
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
      navigateTo('/system-manager/organizations');
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
      // Validacija veličine (min 192x192, max 512x512)
      const img = new Image();
      img.onload = () => {
        if (img.width < 192 || img.height < 192) {
          alert('Logo mora biti minimalno 192x192 piksela.');
          e.target.value = '';
          return;
        }
        if (img.width > 512 || img.height > 512) {
          alert('Logo ne smije biti veći od 512x512 piksela.');
          e.target.value = '';
          return;
        }
        
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      };
      
      // Validacija file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo ne smije biti veći od 2MB.');
        e.target.value = '';
        return;
      }
      
      img.src = URL.createObjectURL(file);
    }
  };

  const handleRemoveLogo = (): void => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleResetCredentials = async (): Promise<void> => {
    if (!id || !window.confirm('Are you sure you want to reset credentials for this organization\'s manager? This action cannot be undone.')) {
      return;
    }
    try {
      setError(null);
      const response = await resetOrganizationManagerCredentials(parseInt(id));
      alert(response.message); // Prikazujemo poruku u alertu
    } catch (err) {
      console.error('Error resetting credentials:', err);
      setError('Failed to reset credentials.');
    }
  };

  const handle2faAction = async (): Promise<void> => {
    if (!organization?.system_manager?.id) return;

    try {
      setError(null);
      setSaving(true);

      const endpoint = twoFactorAction === 'enable' 
        ? '/system-manager/enable-2fa-for-user'
        : '/system-manager/disable-2fa-for-user';

      const body = twoFactorAction === 'enable' 
        ? { systemManagerId: organization.system_manager.id, pin: twoFactorPin }
        : { systemManagerId: organization.system_manager.id };

      await systemManagerApi.post(endpoint, body);

      // Refresh organization data
      await loadOrganization();
      setShow2faModal(false);
      setTwoFactorPin('');
      
      alert(`2FA ${twoFactorAction === 'enable' ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      console.error('Error updating 2FA:', err);
      setError(err instanceof Error ? err.message : 'Failed to update 2FA');
    } finally {
      setSaving(false);
    }
  };

  const openEnable2faModal = (): void => {
    setTwoFactorAction('enable');
    setTwoFactorPin('');
    setShow2faModal(true);
  };

  const openDisable2faModal = (): void => {
    setTwoFactorAction('disable');
    setShow2faModal(true);
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
          onClick={() => navigateTo('/system-manager/organizations')}
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
                    PNG, JPG ili SVG | Min: 192×192px | Max: 512×512px, 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street_address">Street Address</Label>
                <Input
                  id="street_address"
                  value={formData.street_address ?? ''}
                  onChange={(e) => handleChange('street_address', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city ?? ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code ?? ''}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country ?? ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
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

            <div>
              <Label htmlFor="default_language">Default Language</Label>
              <select
                id="default_language"
                value={formData.default_language ?? 'hr'}
                onChange={(e) => handleChange('default_language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hr">Croatian (Hrvatski)</option>
                <option value="en">English</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                This language will be used by default for all members of this organization. SystemManager will always use English.
              </p>
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

            {/* Document Links */}
            {/* Uredi poveznice na dokumente politike i pravila */}
            <div className="pt-6 border-t space-y-4">
              <h3 className="text-lg font-semibold">Document Links</h3>
              <div>
                <Label htmlFor="ethics_code_url">Ethics Code URL</Label>
                <Input
                  id="ethics_code_url"
                  type="url"
                  value={formData.ethics_code_url ?? ''}
                  onChange={(e) => handleChange('ethics_code_url', e.target.value)}
                  placeholder="https://example.com/ethics"
                />
              </div>
              <div>
                <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
                <Input
                  id="privacy_policy_url"
                  type="url"
                  value={formData.privacy_policy_url ?? ''}
                  onChange={(e) => handleChange('privacy_policy_url', e.target.value)}
                  placeholder="https://example.com/privacy"
                />
              </div>
              <div>
                <Label htmlFor="membership_rules_url">Membership Rules URL</Label>
                <Input
                  id="membership_rules_url"
                  type="url"
                  value={formData.membership_rules_url ?? ''}
                  onChange={(e) => handleChange('membership_rules_url', e.target.value)}
                  placeholder="https://example.com/membership-rules"
                />
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
                  <div className="relative">
                    <Input
                      id="sm_password"
                      type={showSmPassword ? 'text' : 'password'}
                      value={formData.sm_password}
                      onChange={(e) => handleChange('sm_password', e.target.value)}
                      placeholder="Enter new password to change"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmPassword(!showSmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showSmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Only fill this if you want to change the password
                  </p>
                </div>
              </div>
            </div>

            {/* System Manager Security Section */}
            {currentManager?.organization_id === null && organization?.system_manager && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">System Manager Security</h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-600">
                          {organization.system_manager.two_factor_enabled 
                            ? `Enabled (${organization.system_manager.two_factor_preferred_channel?.toUpperCase()})` 
                            : 'Disabled'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {organization.system_manager.two_factor_enabled ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openDisable2faModal}
                            disabled={saving}
                          >
                            Disable 2FA
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openEnable2faModal}
                            disabled={saving}
                          >
                            Enable 2FA
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">System Manager Account</h4>
                        <p className="text-sm text-gray-600">
                          Username: {organization.system_manager.username}
                        </p>
                        <p className="text-sm text-gray-600">
                          Email: {organization.system_manager.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Manager Security Settings */}
            {currentManager?.organization_id === null && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">System Manager Security</h3>
                
                {/* Trusted Devices Settings */}
                <div className="mb-6">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="org-trusted-devices-toggle" className="text-sm font-medium">
                        Enable Trusted Devices
                      </Label>
                      <p className="text-xs text-gray-600">
                        Allow organization members' devices to be remembered for 30 days to skip 2FA
                      </p>
                    </div>
                    <Switch
                      id="org-trusted-devices-toggle"
                      checked={trustedDevicesEnabled}
                      onCheckedChange={(checked) => void updateTrustedDevicesSettings(checked)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentManager?.organization_id === null && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-2">Danger Zone</h3>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Reset Credentials</h4>
                      <p className="text-sm text-gray-600">This will reset password to "manager123".</p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleResetCredentials()}
                    >
                      Reset Credentials
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigateTo('/system-manager/organizations')}
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

      {/* 2FA Modal */}
      {show2faModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">
                {twoFactorAction === 'enable' ? 'Enable 2FA' : 'Disable 2FA'}
              </h3>
            </div>
            
            {twoFactorAction === 'enable' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter a 6-digit PIN that the System Manager will use for two-factor authentication.
                </p>
                <div>
                  <Label htmlFor="pin">6-Digit PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={6}
                    value={twoFactorPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Samo brojevi
                      setTwoFactorPin(value);
                    }}
                    placeholder="123456"
                    className="w-24 text-center"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Are you sure you want to disable two-factor authentication for this System Manager?
              </p>
            )}

            <div className="flex gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShow2faModal(false);
                  setTwoFactorPin('');
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handle2faAction()}
                disabled={saving || (twoFactorAction === 'enable' && twoFactorPin.length !== 6)}
              >
                {saving ? 'Processing...' : (twoFactorAction === 'enable' ? 'Enable 2FA' : 'Disable 2FA')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationEdit;
