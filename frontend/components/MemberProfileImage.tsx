import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { API_BASE_URL } from '../src/utils/config';
import { User, Info } from 'lucide-react';
import { formatDate } from '../src/utils/dateUtils';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';

interface Props {
  member: Member;
  onUpdate?: () => Promise<void>;
}

const MemberProfileImage: React.FC<Props> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgKey, setImgKey] = useState(Date.now());
  const [imageFailed, setImageFailed] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Provjera može li korisnik uređivati sliku
  const canEditImage = user?.role === 'member_administrator' || user?.role === 'member_superuser' || user?.member_id === member.member_id;

  // Provjera je li korisnik administrator ili superuser za prikaz naslova
  const isAdminOrSuperuser = user?.role === 'member_administrator' || user?.role === 'member_superuser';

  // Puno ime člana
  const memberFullName = `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`;

  // Determine which property to use from the Member type
  const imagePath = member.profile_image_path ?? member.profile_image;

  // Reset image failure state when member or path changes
  useEffect(() => {
    if (imagePath) {

      setPreviewUrl(null);
      setImageFailed(false);
      setImgKey(Date.now());
    }
  }, [member, imagePath]);

  // Generate image URL with cache-busting
  const getImageUrl = (path: string | undefined): string | null => {
    if (!path) return null;

    if (path.startsWith('/uploads')) {
      // Get base URL without /api suffix if present
      let baseUrl = API_BASE_URL;
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 4);
      }

      // Construct URL with cache busting
      return `${baseUrl}${path}?t=${imgKey}`;
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
        title: t('memberProfile.profileImage.uploadErrorTitle'),
        description: t('memberProfile.profileImage.unsupportedFormat'),
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

      const response = await fetch(`${API_BASE_URL}/members/${member.member_id}/profile-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error:', response.status, errorText);
        throw new Error(`Image upload failed: ${response.statusText}`);
      }

      const result: unknown = await response.json();
      console.log('Upload successful, server response:', result);

      // Force refresh member data from server
      if (onUpdate) await onUpdate();

      // Update UI state
      setImgKey(Date.now());

      toast({
        title: t('memberProfile.profileImage.uploadSuccessTitle'),
        description: t('memberProfile.profileImage.uploadSuccessDescription'),
        variant: "success",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: t('memberProfile.profileImage.uploadErrorTitle'),
        description: error instanceof Error ? error.message : t('memberProfile.profileImage.uploadFailed'),
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
            {t('memberProfile.profileImage.title')}
          </CardTitle>
        ) : null}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          title={t('common.toggleDebug')}
          aria-label={t('common.toggleDebug')}
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
                alt={t('memberProfile.profileImage.previewAlt')}
                className="w-full h-full object-cover"
              />
            ) : displayImageSrc ? (
              <img
                key={imgKey}
                src={displayImageSrc}
                alt={t('memberProfile.profileImage.profileAlt')}
                className="w-full h-full object-cover"
                onError={handleImageError}
                crossOrigin="anonymous"
                loading="eager" // Prioritize loading
                referrerPolicy="no-referrer" // Don't send referrer for security
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
                {isUploading ? t('memberProfile.profileImage.uploading') : t('memberProfile.profileImage.uploadButton')}
              </label>
            </>
          )}

{debugMode && (
            <div className="mt-2 p-2 border rounded bg-gray-50 w-full overflow-auto text-xs">
              <p>{t('memberProfile.profileImage.imagePath')}: {imagePath ?? 'none'}</p>
              <p>{t('memberProfile.profileImage.imageUrl')}: {displayImageSrc ?? 'none'}</p>
              <p>{t('memberProfile.profileImage.failedToLoad')}: {imageFailed ? t('common.yes') : t('common.no')}</p>
              <p>{t('memberProfile.profileImage.lastUpdated')}: {formatDate(new Date(imgKey), "HH:mm:ss")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberProfileImage;