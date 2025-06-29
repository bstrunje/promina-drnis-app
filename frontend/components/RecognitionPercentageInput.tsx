import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import React from 'react';

interface RecognitionPercentageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  id?: string;
}

const RecognitionPercentageInput = ({
  value,
  onChange,
  label = 'Priznavanje (%)',
  id = 'recognitionPercentage',
}: RecognitionPercentageInputProps) => {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor={id} className="text-right">
        {label}
      </Label>
      <div className="col-span-3">
        <Input
          id={id}
          type="number"
          value={value}
          onChange={onChange}
          required
          min="0"
          max="100"
        />
      </div>
    </div>
  );
};

export default RecognitionPercentageInput;