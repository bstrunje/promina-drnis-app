import React, { useState } from "react";
import { Button } from "@components/ui/button";
import { getCurrentYear } from "../../../utils/dateUtils";

interface ArchiveDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onArchive: (year: number, notes: string, force: boolean) => Promise<void>;
}

/**
 * Modalna komponenta za arhiviranje inventara markica
 */
export const ArchiveDialog: React.FC<ArchiveDialogProps> = ({
  isOpen,
  isLoading,
  onClose,
  onArchive
}) => {
  const [archiveYear, setArchiveYear] = useState(getCurrentYear() - 1);
  const [archiveNotes, setArchiveNotes] = useState("");
  const [forceArchive, setForceArchive] = useState(false);

  if (!isOpen) return null;

  // Koristimo void operator da izbjegnemo ESLint grešku no-misused-promises
  const handleArchive = () => {
    void onArchive(archiveYear, archiveNotes, forceArchive);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-medium mb-4">Archive Stamp Inventory</h3>
        <p className="text-gray-600 mb-4">
          This will archive the stamp inventory data for the selected year. 
          This action is used to maintain a historical record without affecting the current inventory.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year to Archive
          </label>
          <input
            type="number"
            value={archiveYear}
            onChange={(e) => setArchiveYear(parseInt(e.target.value))}
            className="w-full p-2 border rounded"
            min="2020"
            max="2050"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={archiveNotes}
            onChange={(e) => setArchiveNotes(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Add notes about this archive (e.g., reason, number of new stamps added)"
          />
        </div>
        
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={forceArchive} 
              onChange={(e) => setForceArchive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Force archive (override if year already has records)</span>
          </label>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleArchive}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Archive Inventory"}
          </Button>
        </div>
      </div>
    </div>
  );
};
