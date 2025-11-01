import React from "react";
import { useAuth } from "../../context/useAuth";
import { useTranslation } from 'react-i18next';
import { Switch } from "../../../components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import CardNumberManagement from './CardNumberManagement';
import { useSystemSettings } from "../../hooks/useSystemSettings";
import { updateSystemSettings } from "../../utils/api/apiSettings";

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation('settings');
  const { systemSettings, refetch } = useSystemSettings();
  const allowFormer = Boolean(systemSettings?.allowFormerMembersInSelectors);
  const [saving, setSaving] = React.useState(false);
  const onToggle = async (value: boolean) => {
    if (saving) return; // spriječi dvoklik
    setSaving(true);
    try {
      const updated = await updateSystemSettings({ allowFormerMembersInSelectors: value });
      // Emit immediate update to listeners to prevent UI flicker
      const merged = { ...(systemSettings ?? {}), ...updated };
      window.dispatchEvent(new CustomEvent('systemSettingsUpdated', { detail: merged }));
      refetch();
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="p-6">
      {user?.role === 'member_superuser' && (
        <div className="mt-8">
          <CardNumberManagement />
        </div>
      )}
      {user?.role === 'member_superuser' && (
        <Card className="my-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('activities.allowFormerMembers.title')}</CardTitle>
              <CardDescription>{t('activities.allowFormerMembers.description')}</CardDescription>
            </div>
            <Switch checked={allowFormer} disabled={saving} onCheckedChange={(value) => { void onToggle(value); }} />
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default Settings;