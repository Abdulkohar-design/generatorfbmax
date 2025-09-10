import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  id: string;
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
  isLoading: boolean;
  file: File | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ id, onFileSelect, previewUrl, isLoading, file }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
        onFileSelect(selectedFile);
      } else {
        alert("Silakan unggah file gambar atau video (misalnya, JPG, PNG, MP4, MOV).");
      }
    }
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 overflow-hidden
        ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
        dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 ${isDragging ? 'dark:bg-indigo-900/20' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {previewUrl && !isLoading && (
          file?.type.startsWith('image/') ? (
            <img src={previewUrl} alt="Pratinjau" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video src={previewUrl} muted autoPlay loop className="absolute inset-0 w-full h-full object-cover" />
          )
        )}
        <div className={`relative z-10 flex flex-col items-center justify-center pt-5 pb-6 text-center p-4 transition-opacity duration-300 ${previewUrl ? 'bg-black/50 w-full h-full opacity-0 hover:opacity-100' : ''}`}>
          <UploadIcon className={`w-10 h-10 mb-3 ${previewUrl ? 'text-white' : 'text-slate-400'}`} />
          <p className={`mb-2 text-sm ${previewUrl ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            <span className="font-semibold">Klik untuk mengunggah</span> atau seret dan lepas
          </p>
          <p className={`text-xs ${previewUrl ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
            Gambar (PNG, JPG) atau Video (MP4, MOV)
          </p>
        </div>
      </label>
      <input
        id={id}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => handleFileChange(e.target.files)}
      />
    </div>
  );
};