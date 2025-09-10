import React from 'react';
import { SparklesIcon } from './icons';

interface SuggestionBoxProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  title: string;
}

export const SuggestionBox: React.FC<SuggestionBoxProps> = ({ suggestions, onSelect, title }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
      <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center mb-2">
        <SparklesIcon className="w-4 h-4 mr-2 text-indigo-500" />
        Saran {title}
      </h4>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="w-full text-left text-sm p-2 bg-white dark:bg-slate-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors duration-150 text-slate-700 dark:text-slate-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};