import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';

interface MemberProfileImageProps {
  member: Member;
  onUpdate: () => Promise<void>;
}

const MemberProfileImage: React.FC<MemberProfileImageProps> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    setImageFile(file);
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/members/${member.member_id}/profile-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
  
      await onUpdate();
      
      toast({
        title: "Success",
        description: "Profile image updated successfully",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Image</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden">
            {imageFile ? (
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : member.profile_image ? (
              <img
                src={member.profile_image}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                No Image
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="image-upload"
            className={`px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isUploading ? "Uploading..." : "Upload New Image"}
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberProfileImage;