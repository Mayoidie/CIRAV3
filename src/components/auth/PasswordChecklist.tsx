import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordChecklistProps {
  password: string;
  isSubmitted: boolean;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ password, isSubmitted }) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[@$!%*?&]/.test(password),
  };

  const checklistItems = [
    { key: 'length', text: 'At least 8 characters' },
    { key: 'uppercase', text: 'Contains an uppercase letter' },
    { key: 'lowercase', text: 'Contains a lowercase letter' },
    { key: 'digit', text: 'Contains a digit' },
    { key: 'symbol', text: 'Contains a symbol' },
  ];

  const getColor = (hasPassed: boolean) => {
    if (hasPassed) return 'text-[#1DB954]';
    if (isSubmitted) return 'text-[#FF4D4F]';
    return 'text-[#7A7A7A]';
  };

  return (
    <div className="mt-2 space-y-1">
      {checklistItems.map(item => {
        const hasPassed = checks[item.key as keyof typeof checks];
        return (
          <div key={item.key} className={`flex items-center text-sm ${getColor(hasPassed)}`}>
            {hasPassed ? (
              <Check className="w-4 h-4 mr-2" />
            ) : isSubmitted ? (
              <X className="w-4 h-4 mr-2" />
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
};
