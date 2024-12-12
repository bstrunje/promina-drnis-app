import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/ui/card";
import { Member } from "@shared/types/member";
import { useAuth } from "../../context/AuthContext";

const MemberDetailsPage: React.FC<{ member?: Member }> = () => {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files[0]) {
      setImageFile(files[0]);
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", files[0]);

      try {
        const response = await fetch(
          `/api/members/${user.member_id}/profile-image`,
          {
            method: "POST",
            body: formData,
          }
        );
        if (!response.ok) throw new Error("Failed to upload image");
        // Show success message or update image preview
      } catch (error) {
        console.error("Error uploading image:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement comment submission
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Member Profile</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 mb-4">
                {/* TODO: Show current profile image */}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
                {isUploading ? 'Uploading...' : 'Upload New Image'}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Full Name</label>
                <p>
                  {user.first_name} {user.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p>{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p>{user.cell_phone}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p>{user.street_address}</p>
                <p>{user.city}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comment Section */}
        <Card>
          <CardHeader>
            <CardTitle>Send Message to Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCommentSubmit}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
                rows={4}
                placeholder="Type your message here..."
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Send Message
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Activity History Section */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {/* TODO: Add activity history component */}
          </CardContent>
        </Card>
      </div>
      // Image preview
      {imageFile && (
        <img
          src={URL.createObjectURL(imageFile)}
          alt="Profile preview"
          className="w-32 h-32 rounded-full object-cover"
        />
      )}
    </div>
  );
};

export default MemberDetailsPage;
