import React, { useState, useEffect } from 'react';
import { Input } from '@components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@components/ui/popover';
import { Calendar } from '@components/ui/calendar';
import { Button } from '@components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { hr } from 'date-fns/locale';
import { formatDate, parseDate, formatDateToIsoDateString } from '../src/utils/dateUtils';
import { isValid, parseISO } from 'date-fns';

interface CustomDateInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  validationError?: string | null;
}

const CustomDateInput: React.FC<CustomDateInputProps> = ({
  value,
  onChange,
  placeholder = 'dd.MM.yyyy',
  id,
  name,
  validationError,
}) => {
  const [displayedDate, setDisplayedDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  // Sinkroniziraj prikazani datum kad se promijeni value iz parenta
  useEffect(() => {
    if (value) {
      const dateObj = parseDate(value, 'yyyy-MM-dd') || parseDate(value, 'dd.MM.yyyy');
      if (dateObj && isValid(dateObj)) {
        setDisplayedDate(formatDate(dateObj, 'dd.MM.yyyy'));
      } else {
        setDisplayedDate('');
      }
    } else {
      setDisplayedDate('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Ukloni sve što nije broj ili točka
    inputValue = inputValue.replace(/[^\d.]/g, '');

    // Automatsko dodavanje točaka za dd.MM.yyyy format
    if (inputValue.length === 2 && displayedDate.length === 1 && !inputValue.includes('.')) {
      inputValue += '.';
    } else if (inputValue.length === 5 && displayedDate.length === 4 && inputValue.indexOf('.') === 2 && inputValue.lastIndexOf('.') === 2) {
      // Provjeri da je prva točka na mjestu i da nema druge točke još
      inputValue += '.';
    }

    // Ograniči duljinu na 10 znakova (dd.MM.yyyy)
    if (inputValue.length > 10) {
      inputValue = inputValue.substring(0, 10);
    }

    setDisplayedDate(inputValue);
  };

  // Kada korisnik napusti polje, validiraj i pošalji parentu vrijednost u yyyy-MM-dd (za input type="date" i spremanje)
  const handleBlur = () => {
    if (displayedDate === '') {
      onChange(null);
      return;
    }
    const parsedDate = parseDate(displayedDate, 'dd.MM.yyyy');
    if (parsedDate && isValid(parsedDate)) {
      onChange(formatDateToIsoDateString(parsedDate));
    } else {
      onChange(null);
    }
  };

  // Kad korisnik odabere datum iz kalendara, prikaži dd.MM.yyyy, ali parentu pošalji yyyy-MM-dd
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && isValid(selectedDate)) {
      setDisplayedDate(formatDate(selectedDate, 'dd.MM.yyyy'));
      onChange(formatDateToIsoDateString(selectedDate));
    } else {
      onChange(null);
      setDisplayedDate('');
    }
    setIsCalendarOpen(false);
  };

  // Kalendar očekuje Date objekt ili undefined (nikad null)
  const calendarSelectedProp = value
    ? (parseDate(value, 'yyyy-MM-dd') || parseDate(value, 'dd.MM.yyyy')) || undefined
    : undefined;

  return (
    <div>
      <div className="flex items-center">
        <Input
          type="text"
          id={id}
          name={name}
          value={displayedDate}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full p-2 border rounded ${validationError ? 'border-red-500' : 'border-gray-300'}`}
        />
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="ml-2 px-3">
              <CalendarIcon className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={calendarSelectedProp}
              onSelect={handleDateSelect}
              initialFocus
              locale={hr}
            />
          </PopoverContent>
        </Popover>
      </div>
      {validationError && (
        <p className="text-sm text-red-500 mt-1">{validationError}</p>
      )}
    </div>
  );
};

export default CustomDateInput;
