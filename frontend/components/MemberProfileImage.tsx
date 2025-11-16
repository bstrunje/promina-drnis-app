import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { API_BASE_URL } from '../src/utils/config';
import { User, Info } from 'lucide-react';
import { formatDate } from '../src/utils/dateUtils';
import { useAuth } from '../src/context/useAuth';
import { useTranslation } from 'react-i18next';
import api from '../src/utils/api/apiConfig';
import { getCurrentTenant } from '../src/utils/tenantUtils';

interface Props {
  member: Member;
  onUpdate?: () => Promise<void>;
}

const MemberProfileImage: React.FC<Props> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation(['profile', 'common']);
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Determine which property to use from the Member type
  const imagePath = member.profile_image_path ?? member.profile_image;

  // Cache-busting key se generira samo kada se imagePath promijeni
  const imgKey = useMemo(() => Date.now(), [imagePath]);

  // Provjera može li korisnik uređivati sliku
  const canEditImage = user?.role === 'member_administrator' || user?.role === 'member_superuser' || user?.member_id === member.member_id;

  // Provjera je li korisnik administrator ili superuser za prikaz naslova
  const isAdminOrSuperuser = user?.role === 'member_administrator' || user?.role === 'member_superuser';

  // Puno ime člana
  const memberFullName = `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`;

  // Reset image failure state when member or path changes
  useEffect(() => {
    if (imagePath) {
      setPreviewUrl(null);
      setImageFailed(false);
      // Ne mijenjaj imgKey ovdje - to uzrokuje beskonačnu petlju
      // imgKey se mijenja samo nakon uspješnog upload-a
    }
  }, [member, imagePath]);

  // Generate image URL with cache-busting
  const getImageUrl = (path: string | undefined): string | null => {
    if (!path) return null;

    // Lokalni uploads (dev/Docker) - koristi postojeći statički handler
    if (path.startsWith('/uploads')) {
      // Get base URL without /api suffix if present
      let baseUrl = API_BASE_URL;
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 4);
      }

      // Construct URL with cache busting
      return `${baseUrl}${path}?t=${imgKey}`;
    }

    // Production: Vercel Blob ili bilo koji apsolutni URL se dohvaća preko backend proxy endpointa
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const tenant = getCurrentTenant();
      // Koristi API_BASE_URL (s /api) + tenant parametar za tenant-aware backend poziv
      return `${API_BASE_URL}/members/${member.member_id}/profile-image?tenant=${encodeURIComponent(tenant)}&t=${imgKey}`;
    }

    return path;
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    console.log('Selected file:', file.name, file.type, file.size);

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: t('profileImage.uploadErrorTitle'),
        description: t('profileImage.unsupportedFormat'),
        variant: "destructive",
      });
      return;
    }



    // Create preview URL for immediate feedback
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      console.log(`Uploading image for member ${member.member_id}`);

      // MULTI-TENANCY: Koristi api instance koja automatski dodaje tenant parametar
      const response = await api.post(`/members/${member.member_id}/profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload successful, server response:', response.data);

      // Force refresh member data from server
      if (onUpdate) await onUpdate();

      // Update UI state
      // imgKey će se automatski ažurirati kada se imagePath promijeni u member objektu
      setPreviewUrl(null); // Očisti preview da se prikaže stvarna slika s servera
      setImageFailed(false); // Reset error state

      toast({
        title: t('profileImage.uploadSuccessTitle'),
        description: t('profileImage.uploadSuccessDescription'),
        variant: "success",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: t('profileImage.uploadErrorTitle'),
        description: error instanceof Error ? error.message : t('profileImage.uploadFailed'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Determine which image to show
  const displayImageSrc = !imageFailed && (imagePath ? getImageUrl(imagePath) : previewUrl);

  // Handle image error with fallback - now we just set imageFailed=true without changing src
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', (e.target as HTMLImageElement).src);
    setImageFailed(true);
  };

  return (
    <Card>
      <CardHeader>
        {/* Naslov kartice se prikazuje samo administrator i superuser korisnicima */}
        {isAdminOrSuperuser ? (
          <CardTitle>
            <User className="h-5 w-5 inline-block mr-2" />
            {t('profileImage.title')}
          </CardTitle>
        ) : null}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          title={t('toggleDebug', { ns: 'common'})}
          aria-label={t('toggleDebug', { ns: 'common'})}
          style={{ opacity: 0 }}
        >
          <Info className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          {/* Prikaži ime člana iznad slike */}
          <h3 className="text-xl font-semibold mb-2">{memberFullName}</h3>
          
          <div
            className="w-[200px] h-[200px] overflow-hidden border-4 border-blue-500 rounded-full flex items-center justify-center"
            onClick={() => debugMode ? setDebugMode(false) : null}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t('profileImage.previewAlt')}
                className="w-full h-full object-cover"
              />
            ) : displayImageSrc ? (
              <img
                key={imgKey}
                src={displayImageSrc}
                alt={t('profileImage.profileAlt')}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : (
              // Empty container - no icon
              <div className="w-full h-full bg-gray-200"></div>
            )}
          </div>

          {/* Prikaži kontrole za upload samo ako korisnik ima dozvolu */}
          {canEditImage && (
            <>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={e => { void handleImageUpload(e); }}
                className="hidden"
                id={`profileImageUpload-${member.member_id}`}
                disabled={isUploading}
              />

              <label
                htmlFor={`profileImageUpload-${member.member_id}`}
                className={`px-4 py-2 bg-black text-white rounded cursor-pointer hover:bg-blue-700 transition-colors ${isUploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isUploading ? t('profileImage.uploading') : t('profileImage.uploadButton')}
              </label>
            </>
          )}

{debugMode && (
            <div className="mt-2 p-2 border rounded bg-gray-50 w-full overflow-auto text-xs">
              <p>{t('profileImage.imagePath')}: {imagePath ?? 'none'}</p>
              <p>{t('profileImage.imageUrl')}: {displayImageSrc ?? 'none'}</p>
              <p>{t('profileImage.failedToLoad')}: {imageFailed ? t('common:yes') : t('common:no')}</p>
              <p>{t('profileImage.lastUpdated')}: {formatDate(new Date(imgKey), "HH:mm:ss")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberProfileImage;