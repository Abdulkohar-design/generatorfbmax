import React from 'react';
import type { GeneratedMetadata, EditableMetadata } from '../types';
import { SuggestionBox } from './SuggestionBox';
import { CopyIcon } from './icons';

interface MetadataFormProps {
  generatedMetadata: GeneratedMetadata | null;
  editableMetadata: EditableMetadata;
  onMetadataChange: (field: keyof EditableMetadata, value: string) => void;
  isLoading: boolean;
}

const InputField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; }> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
    </div>
);

const TextAreaField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder: string; }> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={5} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
    </div>
);

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
};

const SkeletonLoader: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
        ))}
    </div>
);

export const MetadataForm: React.FC<MetadataFormProps> = ({ generatedMetadata, editableMetadata, onMetadataChange, isLoading }) => {
    if (isLoading) {
        return <SkeletonLoader />;
    }

    if (!generatedMetadata) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <p>Unggah gambar untuk memulai.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-slate-800 dark:text-slate-200">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul</label>
                <div className="relative">
                    <input type="text" value={editableMetadata.title} onChange={(e) => onMetadataChange('title', e.target.value)} placeholder="Judul menarik Anda" className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
                    <button onClick={() => copyToClipboard(editableMetadata.title)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-indigo-500">
                        <CopyIcon className="w-5 h-5" />
                    </button>
                </div>
                <SuggestionBox title="Judul" suggestions={generatedMetadata.titles} onSelect={(s) => onMetadataChange('title', s)} />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                 <div className="relative">
                    <textarea value={editableMetadata.description} onChange={(e) => onMetadataChange('description', e.target.value)} placeholder="Deskripsi menarik tentang konten Anda" rows={5} className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
                    <button onClick={() => copyToClipboard(editableMetadata.description)} className="absolute top-0 right-0 flex items-center pt-3 pr-3 text-slate-400 hover:text-indigo-500">
                        <CopyIcon className="w-5 h-5" />
                    </button>
                </div>
                <SuggestionBox title="Deskripsi" suggestions={generatedMetadata.descriptions} onSelect={(s) => onMetadataChange('description', s)} />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hashtag</label>
                <div className="relative">
                     <input type="text" value={editableMetadata.hashtags} onChange={(e) => onMetadataChange('hashtags', e.target.value)} placeholder="#hashtag #relevan #disini" className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
                    <button onClick={() => copyToClipboard(editableMetadata.hashtags)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-indigo-500">
                        <CopyIcon className="w-5 h-5" />
                    </button>
                </div>
                {generatedMetadata.hashtags && generatedMetadata.hashtags.length > 0 && (
                     <div className="mt-2 p-2 flex flex-wrap gap-2">
                        {generatedMetadata.hashtags.map((tag, i) => (
                           <button key={i} onClick={() => onMetadataChange('hashtags', `${editableMetadata.hashtags} #${tag}`.trim())} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition">
                               #{tag}
                           </button>
                        ))}
                    </div>
                )}
            </div>

            <InputField label="Ajakan Bertindak (CTA)" value={editableMetadata.cta} onChange={(e) => onMetadataChange('cta', e.target.value)} placeholder="contoh: Pelajari lebih lanjut di situs web kami!" />
            <InputField label="Lokasi" value={editableMetadata.location} onChange={(e) => onMetadataChange('location', e.target.value)} placeholder="contoh: Jakarta, Indonesia" />
        </div>
    );
};