import React from "react";
import { StampTypeData } from "./types";

interface StampTypeCardProps {
  title: string;
  type: "employedStamps" | "studentStamps" | "pensionerStamps";
  data: StampTypeData;
  bgColor: string;
  textColor: string;
  isEditing: boolean;
  onInputChange: (type: "employedStamps" | "studentStamps" | "pensionerStamps", value: number) => void;
  onInputBlur: (type: "employedStamps" | "studentStamps" | "pensionerStamps", value: number) => void;
  onInputFocus: (type: "employedStamps" | "studentStamps" | "pensionerStamps") => void;
}

/**
 * Komponenta za prikaz jednog tipa markice (employed, student, pensioner)
 */
export const StampTypeCard: React.FC<StampTypeCardProps> = ({
  title,
  type,
  data,
  bgColor,
  textColor,
  isEditing,
  onInputChange,
  onInputBlur,
  onInputFocus
}) => {
  return (
    <div className={`${bgColor} p-4 rounded-lg`}>
      {/* Vraćeno na 'hidden sm:block' */}
      <h3 className={`font-medium ${textColor} hidden sm:block`}>
        {title}
      </h3>
      {/* Uvijek koristi grid s 3 stupca */}
      <div className="grid grid-cols-3 gap-4 mt-2">
        <div>
          <label className={`text-xs ${textColor.replace("800", "700")}`}>Initial</label>
          {isEditing ? (
            <input
              type="number"
              min={data.issued}
              value={data.initial}
              onChange={(e) => onInputChange(type, e.target.valueAsNumber)}
              onBlur={(e) => onInputBlur(type, e.target.valueAsNumber)}
              onFocus={() => onInputFocus(type)}
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          ) : (
            <p className={`font-bold ${textColor} text-lg`}>
              {data.initial}
            </p>
          )}
        </div>
        <div>
          <label className={`text-xs ${textColor.replace("800", "700")}`}>Issued</label>
          <p className={`font-bold ${textColor} text-lg`}>
            {data.issued}
          </p>
        </div>
        <div>
          <label className={`text-xs ${textColor.replace("800", "700")}`}>Remaining</label>
          <p className={`font-bold ${textColor} text-lg`}>
            {data.remaining}
          </p>
        </div>
      </div>
    </div>
  );
};
