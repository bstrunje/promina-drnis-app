// features/systemManager/pages/settings/components/CollapsibleSection.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  variant?: 'main' | 'subsection';
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  defaultOpen = false,
  variant = 'main',
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const containerClasses = variant === 'main' 
    ? 'bg-white rounded-lg shadow-sm border border-gray-200'
    : 'border-b border-gray-200 pb-6 last:border-b-0 bg-gray-50';

  const buttonClasses = variant === 'main'
    ? 'w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors'
    : 'w-full flex items-center justify-between hover:bg-gray-100 transition-colors py-3 px-4';

  const titleClasses = variant === 'main'
    ? 'text-lg font-semibold'
    : 'text-base font-medium text-gray-800';

  const contentClasses = variant === 'main'
    ? 'px-6 pb-6 border-t border-gray-100'
    : 'mt-4 px-4';

  return (
    <div className={containerClasses}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <div className="flex items-center gap-2">
          <h2 className={titleClasses}>{title}</h2>
          {description && variant === 'subsection' && (
            <p className="text-gray-500 text-xs">{description}</p>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      {isOpen && (
        <div className={contentClasses}>
          {children}
        </div>
      )}
    </div>
  );
};
