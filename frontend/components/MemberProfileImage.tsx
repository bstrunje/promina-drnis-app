import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { API_BASE_URL, IMAGE_BASE_URL } from '../src/utils/config';
import { User, Info } from 'lucide-react';
import { getCurrentDate, formatDate } from '../src/utils/dateUtils';

interface Props {
  member: Member;
  onUpdate?: () => Promise<void>;
}

const MemberProfileImage: React.FC<Props> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgKey, setImgKey] = useState(Date.now());
  const [imageFailed, setImageFailed] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Determine which property to use from the Member type
  const imagePath = member.profile_image_path || member.profile_image;

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
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    console.log('Selected file:', file.name, file.type, file.size);

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: "Error",
        description: "Only JPG, PNG and GIF formats are supported",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);

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

      const result = await response.json();
      console.log('Upload successful, server response:', result);

      // Force refresh member data from server
      if (onUpdate) await onUpdate();

      // Update UI state
      setImgKey(Date.now());

      toast({
        title: "Success",
        description: "Profile image updated successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Profile Image</CardTitle>
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
          title="Toggle debug info"
        >
          <Info size={16} />
        </button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden flex items-center justify-center">
            {displayImageSrc && !imageFailed ? (
              <img
                key={imgKey}
                src={displayImageSrc}
                alt="Profile"
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

          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />

          <label
            htmlFor="image-upload"
            className={`px-4 py-2 bg-black text-white rounded cursor-pointer hover:bg-blue-700 transition-colors ${isUploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {isUploading ? "Uploading..." : "Upload New Image"}
          </label>

          {debugMode && (
            <div className="mt-2 p-2 border rounded bg-gray-50 w-full overflow-auto text-xs">
              <p>Image path: {imagePath || 'none'}</p>
              <p>Image URL: {displayImageSrc || 'none'}</p>
              <p>Failed to load: {imageFailed ? 'Yes' : 'No'}</p>
              <p>Last updated: {formatDate(new Date(imgKey), "HH:mm:ss")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberProfileImage;