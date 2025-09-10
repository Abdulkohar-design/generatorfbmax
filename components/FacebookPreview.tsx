import React from 'react';
import type { EditableMetadata } from '../types';
import { FacebookIcon } from './icons';

interface FacebookPreviewProps {
  metadata: EditableMetadata;
  mediaUrl: string | null;
  file: File | null;
  isLoading: boolean;
}

const SkeletonLoader: React.FC = () => (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 animate-pulse">
        <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full mr-3"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            </div>
        </div>
        <div className="space-y-3 mb-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
    </div>
);

export const FacebookPreview: React.FC<FacebookPreviewProps> = ({ metadata, mediaUrl, file, isLoading }) => {
    if (isLoading) {
        return <SkeletonLoader />;
    }

    const formatHashtags = (tags: string) => {
        return tags.split(' ').map((tag, index) => (
            tag.startsWith('#') ? <span key={index} className="text-blue-500">{tag} </span> : `${tag} `
        ));
    };

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-800 shadow-lg rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4">
            <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full mr-3 flex items-center justify-center">
                    <img src="https://picsum.photos/40/40" alt="Pengguna" className="w-full h-full rounded-full object-cover" />
                </div>
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Nama Halaman Anda</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Bersponsor · {metadata.location || 'Baru saja'}
                    </p>
                </div>
            </div>
            
            <div className="mb-4 text-slate-700 dark:text-slate-200">
                <h3 className="font-semibold mb-2">{metadata.title || 'Judul Menarik Anda...'}</h3>
                <p className="whitespace-pre-wrap text-sm">
                    {metadata.description || 'Deskripsi menarik Anda akan muncul di sini. Ceritakan tentang konten Anda dan ajukan pertanyaan untuk meningkatkan interaksi!'}
                    {metadata.cta && <><br/><br/>{metadata.cta}</>}
                    {metadata.hashtags && <><br/><br/>{formatHashtags(metadata.hashtags)}</>}
                </p>
            </div>
        </div>

      {mediaUrl ? (
        file?.type.startsWith('video/') ? (
          <video src={mediaUrl} controls className="w-full h-auto bg-black" />
        ) : (
          <img src={mediaUrl} alt="Pratinjau postingan" className="w-full h-auto object-cover" />
        )
      ) : (
        <div className="w-full h-64 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <p className="text-slate-500">Gambar atau Video Anda di Sini</p>
        </div>
      )}

      <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex justify-around text-sm text-slate-600 dark:text-slate-400">
        <button className="flex-1 text-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">Suka</button>
        <button className="flex-1 text-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">Komentari</button>
        <button className="flex-1 text-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">Bagikan</button>
      </div>
    </div>
  );
};