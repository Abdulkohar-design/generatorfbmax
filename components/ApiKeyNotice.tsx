import React from 'react';

export interface ApiKeyNoticeProps {
  className?: string;
  message?: string;
}

export const ApiKeyNotice: React.FC<ApiKeyNoticeProps> = ({ className, message }) => {
  return (
    <p className={`text-yellow-600 dark:text-yellow-400 ${className ?? ''}`}>
      <strong>Peringatan:</strong> {message ?? 'Masukkan API Key di header untuk mengaktifkan fitur AI.'}
    </p>
  );
};