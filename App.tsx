import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { FileUpload } from './components/FileUpload';
import { MetadataForm } from './components/MetadataForm';
import { FacebookPreview } from './components/FacebookPreview';
import { generateFacebookMetadata, generateReactionCaption, generateImagePrompt, generateVeoVideoPrompts, analyzeToneAndAudience, generateImageToVideoPrompt, generateRepurposingIdeas, generateQuotes, generateImageWithImagen, editImageWithGemini, generateImagePromptSuggestions, generateEnglishText, translateText } from './services/geminiService';
import type { GeneratedMetadata, EditableMetadata, ReactionStyle, OutputLength, ToneAnalysisResult, RepurposingIdea, ImageToVideoResult, QuoteCategory, ChatMessage, ActiveTab, TextCategory, GeneratedText } from './types';
import { SparklesIcon, CopyIcon, WandIcon, VideoIcon, TargetIcon, LightbulbIcon, TagIcon, ImageToVideoIcon, KeyIcon, ShareIcon, InstagramIcon, TikTokIcon, XIcon, LinkedInIcon, ChatBubbleIcon, QuoteIcon, DownloadIcon, FacebookIcon, ImageIcon, PencilIcon, SendIcon } from './components/icons';

type ActiveImageGenTab = 'create' | 'edit';

// Helper Components (Moved outside App)

const QuoteImagePreview: React.FC<{ quote: string; onDownload: () => void; }> = ({ quote, onDownload }) => {
    return (
        <div className="relative group">
            <div
                id={`quote-img-${quote.substring(0, 10)}`}
                className="aspect-[9/16] w-full bg-white border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center p-8 flex-col"
                style={{ fontFamily: "'Times New Roman', serif" }}
            >
                <p className="text-2xl md:text-3xl text-center text-black leading-snug">
                    {quote}
                </p>
                <p className="text-lg text-black mt-6">
                    &ndash;vdmax
                </p>
            </div>
            <button
                onClick={onDownload}
                className="absolute bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-indigo-700"
                aria-label="Unduh gambar"
            >
                <DownloadIcon className="w-6 h-6" />
            </button>
        </div>
    );
};

const PlatformIcon: React.FC<{ platform: RepurposingIdea['platform'], className?: string }> = ({ platform, className }) => {
    switch(platform) {
        case 'Instagram': return <InstagramIcon className={className} />;
        case 'TikTok': return <TikTokIcon className={className} />;
        case 'X': return <XIcon className={className} />;
        case 'LinkedIn': return <LinkedInIcon className={className} />;
        default: return null;
    }
};

// Main Tab Components (Moved outside App)

const ContentGenerator: React.FC<any> = ({
    apiKey, file, previewUrl, isLoading, handleFileSelect, generatedMetadata, editableMetadata, 
    handleMetadataChange, handleGenerateRepurposingIdeas, isAnyActionDisabled, isGeneratingRepurposing,
    repurposingIdeas, handleAnalyzeToneAndAudience, isAnalyzingTone, toneAnalysisResult, reactionStyle,
    setReactionStyle, outputLength, setOutputLength, includeHashtags, setIncludeHashtags, 
    handleGenerateReactions, isGeneratingReactions, handleGeneratePrompt, isGeneratingPrompt, imagePrompt,
    handleCopyPrompt, setPromptCopySuccess, promptCopySuccess, handleGenerateImageToVideoPrompt,
    isGeneratingImageToVideoPrompt, imageToVideoResult, setSceneCopySuccess, sceneCopySuccess,
    setDialogueCopySuccess, dialogueCopySuccess, copySuccess, handleCopyAll
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="flex flex-col space-y-8">
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold mb-4">1. Unggah Media Anda</h2>
          <FileUpload id="content-file-upload" onFileSelect={handleFileSelect} previewUrl={previewUrl} isLoading={isLoading} file={file} />
          {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center"><strong>Peringatan:</strong> Masukkan API Key di header untuk mengaktifkan fitur AI.</p>}
        </div>
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold mb-4">2. Hasilkan & Edit Konten</h2>
          <MetadataForm generatedMetadata={generatedMetadata} editableMetadata={editableMetadata} onMetadataChange={handleMetadataChange} isLoading={isLoading} />
          <div className="space-y-6 mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><ShareIcon className="w-5 h-5 mr-2"/>Ide Konten Lintas Platform</h3>
                  <button onClick={handleGenerateRepurposingIdeas} disabled={isAnyActionDisabled || isGeneratingRepurposing} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition">{isGeneratingRepurposing ? 'Mencari Ide...' : 'Dapatkan Ide Lintas Platform'}</button>
                  {repurposingIdeas && (<div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg space-y-4">{repurposingIdeas.map((item: RepurposingIdea, index: number) => (<div key={index} className="flex items-start space-x-3"><PlatformIcon platform={item.platform} className="w-5 h-5 mt-1 text-slate-500 dark:text-slate-400 flex-shrink-0" /><div><h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.platform}</h4><p className="text-sm text-slate-600 dark:text-slate-300">{item.idea}</p></div></div>))}</div>)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><TargetIcon className="w-5 h-5 mr-2"/>Penganalisis Nada & Audiens</h3>
                  <button onClick={handleAnalyzeToneAndAudience} disabled={isAnyActionDisabled || isAnalyzingTone} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/80 disabled:bg-slate-400 disabled:cursor-not-allowed transition">{isAnalyzingTone ? 'Menganalisis...' : 'Dapatkan Wawasan Strategis'}</button>
                  {toneAnalysisResult && (<div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg space-y-4"><div><h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center mb-1"><TagIcon className="w-4 h-4 mr-2 text-indigo-500"/>Nada Konten</h4><p className="text-sm text-slate-800 dark:text-slate-200">{toneAnalysisResult.tone}</p></div><div><h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center mb-1"><TargetIcon className="w-4 h-4 mr-2 text-indigo-500"/>Target Audiens</h4><p className="text-sm text-slate-800 dark:text-slate-200">{toneAnalysisResult.audience}</p></div><div><h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center mb-1"><LightbulbIcon className="w-4 h-4 mr-2 text-indigo-500"/>Poin Pembicaraan Utama</h4><ul className="list-disc list-inside space-y-1 text-sm text-slate-800 dark:text-slate-200">{toneAnalysisResult.talkingPoints.map((point: string, i: number) => <li key={i}>{point}</li>)}</ul></div></div>)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Generator Caption Reaksi</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gaya Reaksi</label><select value={reactionStyle} onChange={(e) => setReactionStyle(e.target.value as ReactionStyle)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"><option>Otomatis</option><option>Wow / Kaget</option><option>Kagum / Satisfying</option><option>Wholesome</option><option>Lucu / Sarkas</option><option>Mindblown</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Panjang Output</label><select value={outputLength} onChange={(e) => setOutputLength(e.target.value as OutputLength)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"><option>Pendek</option><option>Sedang</option><option>Panjang</option></select></div>
                  </div>
                  <div className="flex items-center mb-4"><input type="checkbox" id="includeHashtags" checked={includeHashtags} onChange={(e) => setIncludeHashtags(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/><label htmlFor="includeHashtags" className="ml-2 block text-sm text-slate-900 dark:text-slate-200">Sertakan Hashtag</label></div>
                  <button onClick={handleGenerateReactions} disabled={isAnyActionDisabled || isGeneratingReactions} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/80 disabled:bg-slate-400 disabled:cursor-not-allowed transition">{isGeneratingReactions ? 'Menghasilkan...' : 'Buat Caption Reaksi'}</button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><WandIcon className="w-5 h-5 mr-2"/>Generator Prompt Gambar (Untuk AI)</h3>
                  <button onClick={handleGeneratePrompt} disabled={isAnyActionDisabled || isGeneratingPrompt} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/80 disabled:bg-slate-400 disabled:cursor-not-allowed transition">{isGeneratingPrompt ? 'Menganalisis...' : 'Buat Prompt dari Media'}</button>
                  {imagePrompt && (<div className="mt-4 relative"><p className="text-xs text-slate-500 mb-1">Prompt yang dihasilkan (dalam Bahasa Inggris):</p><textarea readOnly value={imagePrompt} rows={4} className="w-full p-2 border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded-md text-sm font-mono"/><button onClick={() => handleCopyPrompt(imagePrompt, setPromptCopySuccess)} className="absolute top-7 right-2 text-slate-400 hover:text-indigo-500"><CopyIcon className="w-5 h-5" /></button>{promptCopySuccess && <span className="absolute top-8 right-10 text-xs text-indigo-500">Tersalin!</span>}</div>)}
                </div>
                {file && file.type.startsWith('image/') && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><ImageToVideoIcon className="w-5 h-5 mr-2"/>Generator Prompt Gambar-ke-Video (Untuk VEO 3)</h3>
                    <button onClick={handleGenerateImageToVideoPrompt} disabled={isAnyActionDisabled || isGeneratingImageToVideoPrompt} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900/80 disabled:bg-slate-400 disabled:cursor-not-allowed transition">{isGeneratingImageToVideoPrompt ? 'Menganimasikan Ide...' : 'Buat Prompt Animasi & Dialog'}</button>
                    {imageToVideoResult && (
                      <div className="mt-4 space-y-4">
                        <div className="relative"><p className="text-xs text-slate-500 mb-1 flex items-center"><WandIcon className="w-3 h-3 mr-1.5"/>Deskripsi Adegan (dalam Bahasa Inggris):</p><textarea readOnly value={imageToVideoResult.scene_description} rows={4} className="w-full p-2 border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded-md text-sm font-mono"/><button onClick={() => handleCopyPrompt(imageToVideoResult.scene_description, setSceneCopySuccess)} className="absolute top-7 right-2 text-slate-400 hover:text-teal-500"><CopyIcon className="w-5 h-5" /></button>{sceneCopySuccess && <span className="absolute top-8 right-10 text-xs text-teal-500">Tersalin!</span>}</div>
                        {imageToVideoResult.dialogue && (<div className="relative"><p className="text-xs text-slate-500 mb-1 flex items-center"><ChatBubbleIcon className="w-3 h-3 mr-1.5"/>Dialog:</p><textarea readOnly value={imageToVideoResult.dialogue} rows={2} className="w-full p-2 border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded-md text-sm font-mono"/><button onClick={() => handleCopyPrompt(imageToVideoResult.dialogue, setDialogueCopySuccess)} className="absolute top-7 right-2 text-slate-400 hover:text-teal-500"><CopyIcon className="w-5 h-5" /></button>{dialogueCopySuccess && <span className="absolute top-8 right-10 text-xs text-teal-500">Tersalin!</span>}</div>)}
                      </div>
                    )}
                  </div>
                )}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <div className="sticky top-24">
          <h2 className="text-xl font-semibold mb-4">3. Pratinjau & Ekspor</h2>
          <FacebookPreview metadata={editableMetadata} mediaUrl={previewUrl} file={file} isLoading={isLoading} />
          {generatedMetadata && !isLoading && (<div className="mt-6"><button onClick={handleCopyAll} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:bg-slate-400" disabled={isLoading}><CopyIcon className="w-5 h-5 mr-2" />{copySuccess ? 'Tersalin!' : 'Salin Semua Teks'}</button></div>)}
        </div>
      </div>
    </div>
);

const QuoteGenerator: React.FC<any> = ({
    apiKey, quoteCategory, setQuoteCategory, handleGenerateQuotes, isGeneratingQuotes, 
    generatedQuotes, handleDownloadQuote
}) => (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
        <h2 className="text-2xl font-semibold mb-4 text-center">Generator Gambar Kutipan</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Kategori Kutipan</label>
            <select value={quoteCategory} onChange={(e) => setQuoteCategory(e.target.value as QuoteCategory)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500">
              <option>Inspirasi</option>
              <option>Cinta</option>
              <option>Motivasi</option>
              <option>Humor</option>
              <option>Renungan</option>
              <option>Kesuksesan</option>
              <option>Kehidupan</option>
              <option>Persahabatan</option>
              <option>Bijak</option>
              <option>Seni</option>
            </select>
          </div>
          <button onClick={handleGenerateQuotes} disabled={!apiKey || isGeneratingQuotes} className="w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition self-end">
            {isGeneratingQuotes ? 'Menghasilkan...' : 'Buat Kutipan'}
          </button>
        </div>
        {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-4 mb-4 text-center"><strong>Peringatan:</strong> Masukkan API Key di header untuk menggunakan fitur ini.</p>}
      </div>

      {isGeneratingQuotes && <div className="text-center p-8">AI sedang merangkai kata-kata...</div>}
      
      {generatedQuotes.length > 0 && (
        <div className="w-full mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {generatedQuotes.map((quote: string, index: number) => (
            <QuoteImagePreview key={index} quote={quote} onDownload={() => handleDownloadQuote(quote)} />
          ))}
        </div>
      )}
    </div>
);

const ImageGenerator: React.FC<any> = ({
    apiKey, activeImageGenTab, setActiveImageGenTab, imageGenPrompt, setImageGenPrompt, 
    handleGenerateImage, isGeneratingImage, handleGetPromptSuggestions, isGeneratingSuggestions,
    promptSuggestions, generatedImageUrl, handleDownloadDataUrl, imagesToEdit, imageToEditUrls,
    isEditingImage, handleSetImageToEdit, imageEditPrompt, setImageEditPrompt, handleEditImage,
    editedImageUrl, imageAspectRatio, setImageAspectRatio
}) => (
    <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveImageGenTab('create')} className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeImageGenTab === 'create' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    <WandIcon className="mr-2 w-5 h-5" /> Buat Gambar Baru (Imagen 4)
                </button>
                <button onClick={() => setActiveImageGenTab('edit')} className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeImageGenTab === 'edit' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    <PencilIcon className="mr-2 w-5 h-5" /> Edit Gambar (Gemini)
                </button>
            </nav>
        </div>
        
        {!apiKey && <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4 text-center"><strong>Peringatan:</strong> Masukkan API Key di header untuk menggunakan generator gambar.</p>}

        {activeImageGenTab === 'create' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-4">
                         <div>
                            <h3 className="text-lg font-semibold mb-3">1. Opsi Pembuatan</h3>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prompt</label>
                            <textarea value={imageGenPrompt} onChange={(e) => setImageGenPrompt(e.target.value)} placeholder="Contoh: Seekor kucing astronot yang sedang bersantai di bulan, gaya seni digital, detail tinggi" rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rasio Aspek</label>
                            <select value={imageAspectRatio} onChange={(e) => setImageAspectRatio(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500">
                                <option value="1:1">1:1 (Persegi)</option>
                                <option value="9:16">9:16 (Vertikal)</option>
                                <option value="16:9">16:9 (Horizontal)</option>
                            </select>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button onClick={handleGenerateImage} disabled={!apiKey || isGeneratingImage} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition">
                                {isGeneratingImage ? 'Membuat...' : <><WandIcon className="w-4 h-4 mr-2"/>Buat Gambar</>}
                            </button>
                            <button onClick={handleGetPromptSuggestions} disabled={!apiKey || isGeneratingSuggestions} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/80 disabled:bg-slate-400 disabled:cursor-not-allowed transition">
                                {isGeneratingSuggestions ? 'Mencari...' : 'Saran Prompt'}
                            </button>
                        </div>
                        {promptSuggestions.length > 0 && (
                            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                                {promptSuggestions.map((s: string, i: number) => <button key={i} onClick={() => setImageGenPrompt(s)} className="w-full text-left text-xs p-2 bg-white dark:bg-slate-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">{s}</button>)}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-3">2. Hasil Gambar</h3>
                    <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center relative border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {isGeneratingImage && <div className="text-slate-500">AI sedang melukis...</div>}
                        {!isGeneratingImage && generatedImageUrl && <img src={generatedImageUrl} alt="Gambar yang dihasilkan AI" className="w-full h-full object-contain" />}
                        {!isGeneratingImage && !generatedImageUrl && <ImageIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />}
                         {generatedImageUrl && !isGeneratingImage && (
                            <button onClick={() => handleDownloadDataUrl(generatedImageUrl, 'gambar-ai.png')} className="absolute bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-opacity duration-300 hover:bg-indigo-700">
                                <DownloadIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeImageGenTab === 'edit' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-3">1. Unggah Gambar</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gambar Utama (wajib diisi)</label>
                                    <FileUpload id="edit-image-0" onFileSelect={(file) => handleSetImageToEdit(file, 0)} previewUrl={imageToEditUrls[0]} isLoading={isEditingImage} file={imagesToEdit[0]} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gambar Referensi 1 (opsional)</label>
                                    <FileUpload id="edit-image-1" onFileSelect={(file) => handleSetImageToEdit(file, 1)} previewUrl={imageToEditUrls[1]} isLoading={isEditingImage} file={imagesToEdit[1]} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gambar Referensi 2 (opsional)</label>
                                    <FileUpload id="edit-image-2" onFileSelect={(file) => handleSetImageToEdit(file, 2)} previewUrl={imageToEditUrls[2]} isLoading={isEditingImage} file={imagesToEdit[2]} />
                                </div>
                            </div>
                        </div>
                        <div>
                             <h3 className="text-lg font-semibold mb-3">2. Instruksi Pengeditan</h3>
                            <textarea value={imageEditPrompt} onChange={(e) => setImageEditPrompt(e.target.value)} placeholder="Contoh: Tambahkan topi ulang tahun pada orang tersebut" rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition"/>
                        </div>
                        <button onClick={handleEditImage} disabled={!apiKey || !imagesToEdit[0] || !imageEditPrompt || isEditingImage} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition">
                            {isEditingImage ? 'Mengedit...' : <><PencilIcon className="w-4 h-4 mr-2"/>Edit Gambar</>}
                        </button>
                    </div>
                </div>
                <div>
                     <h3 className="text-lg font-semibold mb-3">3. Hasil Gambar yang Diedit</h3>
                    <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center relative border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {isEditingImage && <div className="text-slate-500">AI sedang mengedit...</div>}
                        {!isEditingImage && editedImageUrl && <img src={editedImageUrl} alt="Gambar yang diedit AI" className="w-full h-full object-contain" />}
                        {!isEditingImage && !editedImageUrl && <ImageIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />}
                        {editedImageUrl && !isEditingImage && (
                            <button onClick={() => handleDownloadDataUrl(editedImageUrl, 'gambar-edit-ai.png')} className="absolute bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-opacity duration-300 hover:bg-indigo-700">
                                <DownloadIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
);

const VideoToVeoGenerator: React.FC<any> = ({
    apiKey, handleGenerate, isGenerating, prompts, handleCopy,
    copySuccess, setFile, file, previewUrl
}) => {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Generator Prompt Video VEO</h2>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    Ubah video menjadi serangkaian prompt JSON terstruktur untuk model AI generatif VEO.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-xl font-semibold mb-4">1. Unggah Video Anda</h3>
                <FileUpload 
                    id="veo-prompt-upload" 
                    onFileSelect={setFile} 
                    previewUrl={previewUrl} 
                    isLoading={isGenerating} 
                    file={file} 
                />
                 {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center"><strong>Peringatan:</strong> Masukkan API Key untuk menggunakan fitur ini.</p>}
                <button 
                    onClick={handleGenerate} 
                    disabled={!apiKey || !file || isGenerating} 
                    className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                >
                    {isGenerating ? 'Menganalisis Video...' : 'Buat Prompt VEO dari Video'}
                </button>
            </div>

            {isGenerating && (
                <div className="text-center p-8 space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-500">AI sedang menonton video Anda dan menulis prompt... Ini mungkin memakan waktu beberapa saat.</p>
                </div>
            )}

            {prompts && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-6">
                    <h3 className="text-xl font-semibold">2. Hasil Prompt JSON (per 8 detik)</h3>
                    <div className="relative">
                        <textarea readOnly value={prompts} rows={20} className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 font-mono text-sm"/>
                         <button onClick={handleCopy} className="absolute top-2 right-2 flex items-center p-2 text-slate-400 hover:text-indigo-500">
                            <CopyIcon className="w-5 h-5" />
                        </button>
                        {copySuccess && <span className="absolute top-3.5 right-12 text-xs text-indigo-500">Tersalin!</span>}
                    </div>
                </div>
            )}
        </div>
    );
};


const AIChat: React.FC<{
    history: ChatMessage[];
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    isLoading: boolean;
    apiKey: string;
}> = ({ history, input, setInput, onSend, isLoading, apiKey }) => {

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-240px)] bg-white dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg px-4 py-3 rounded-xl whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'}`}>
                                {msg.parts[0].text}
                                {isLoading && index === history.length - 1 && <span className="inline-block w-2 h-4 bg-current ml-2 animate-ping"></span>}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2 text-center"><strong>Peringatan:</strong> Masukkan API Key untuk mengaktifkan obrolan.</p>}
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ketik pesan Anda di sini... (Tekan Shift+Enter untuk baris baru)"
                        rows={1}
                        className="w-full p-3 pr-16 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition resize-none"
                        disabled={isLoading || !apiKey}
                    />
                    <button
                        onClick={onSend}
                        disabled={isLoading || !input.trim() || !apiKey}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                        aria-label="Kirim Pesan"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const TextGenerator: React.FC<any> = ({
    apiKey, textCategory, setTextCategory, handleGenerateEnglishTexts, isGeneratingTexts,
    generatedTexts, handleCopyText
}) => (
    <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Generator Teks & Terjemahan</h2>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                Hasilkan teks dalam bahasa Inggris dan terjemahkannya ke bahasa Indonesia
            </p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4">1. Pilih Kategori & Hasilkan Teks</h3>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori Teks</label>
                    <select
                        value={textCategory}
                        onChange={(e) => setTextCategory(e.target.value as TextCategory)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option>Motivasi</option>
                        <option>Bisnis</option>
                        <option>Pendidikan</option>
                        <option>Kesehatan</option>
                        <option>Teknologi</option>
                        <option>Seni & Kreativitas</option>
                        <option>Hubungan</option>
                        <option>Kehidupan Sehari-hari</option>
                        <option>Inspirasi</option>
                        <option>Humor</option>
                        <option>Renungan</option>
                        <option>Karir</option>
                        <option>Keuangan</option>
                        <option>Lingkungan</option>
                        <option>Sosial</option>
                        <option>Olahraga</option>
                    </select>
                </div>
                <button
                    onClick={handleGenerateEnglishTexts}
                    disabled={!apiKey || isGeneratingTexts}
                    className="w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition self-end"
                >
                    {isGeneratingTexts ? 'Menghasilkan...' : 'Hasilkan Teks'}
                </button>
            </div>
            {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-4 mb-4 text-center"><strong>Peringatan:</strong> Masukkan API Key untuk menggunakan fitur ini.</p>}
        </div>

        {isGeneratingTexts && (
            <div className="text-center p-8 space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500">AI sedang menulis teks dalam bahasa Inggris...</p>
            </div>
        )}

        {generatedTexts.length > 0 && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 space-y-6">
                <h3 className="text-xl font-semibold">2. Hasil Teks & Terjemahan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generatedTexts.map((text: string, index: number) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs mr-2">{index + 1}</span>
                                    Teks Lengkap
                                </h4>
                                <div className="bg-white dark:bg-slate-700 p-3 rounded-md border border-slate-200 dark:border-slate-600">
                                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                        <span className="font-medium">{generatedTexts[index].english}</span>
                                        <span className="text-slate-600 dark:text-slate-400 italic ml-1">
                                            <strong>Artinya:</strong>"{generatedTexts[index].indonesian}"
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCopyText(`${generatedTexts[index].english} Artinya:"${generatedTexts[index].indonesian}"`)}
                                    className="mt-2 text-xs text-indigo-500 hover:text-indigo-600"
                                >
                                    Salin Teks Lengkap
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);


const App: React.FC = () => {
  // State Umum
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('content');

  // State untuk Generator Konten
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingReactions, setIsGeneratingReactions] = useState<boolean>(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState<boolean>(false);
  
  const [generatedMetadata, setGeneratedMetadata] = useState<GeneratedMetadata | null>(null);
  const [editableMetadata, setEditableMetadata] = useState<EditableMetadata>({
    title: '', description: '', hashtags: '', cta: '', location: '',
  });

  const [reactionStyle, setReactionStyle] = useState<ReactionStyle>('Otomatis');
  const [outputLength, setOutputLength] = useState<OutputLength>('Sedang');
  const [includeHashtags, setIncludeHashtags] = useState<boolean>(true);
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [promptCopySuccess, setPromptCopySuccess] = useState<boolean>(false);
  const [imageToVideoResult, setImageToVideoResult] = useState<ImageToVideoResult | null>(null);
  const [isGeneratingImageToVideoPrompt, setIsGeneratingImageToVideoPrompt] = useState<boolean>(false);
  const [sceneCopySuccess, setSceneCopySuccess] = useState<boolean>(false);
  const [dialogueCopySuccess, setDialogueCopySuccess] = useState<boolean>(false);
  const [toneAnalysisResult, setToneAnalysisResult] = useState<ToneAnalysisResult | null>(null);
  const [repurposingIdeas, setRepurposingIdeas] = useState<RepurposingIdea[] | null>(null);
  const [isGeneratingRepurposing, setIsGeneratingRepurposing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // State untuk Generator Gambar Kutipan
  const [quoteCategory, setQuoteCategory] = useState<QuoteCategory>('Inspirasi');
  const [generatedQuotes, setGeneratedQuotes] = useState<string[]>([]);
  const [isGeneratingQuotes, setIsGeneratingQuotes] = useState<boolean>(false);
  
  // State untuk Generator Gambar AI
  const [activeImageGenTab, setActiveImageGenTab] = useState<ActiveImageGenTab>('create');
  const [imageGenPrompt, setImageGenPrompt] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
  
  const [imagesToEdit, setImagesToEdit] = useState<(File | null)[]>([null, null, null]);
  const [imageToEditUrls, setImageToEditUrls] = useState<(string | null)[]>([null, null, null]);
  const [imageEditPrompt, setImageEditPrompt] = useState<string>('');
  const [isEditingImage, setIsEditingImage] = useState<boolean>(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  // State untuk Asisten AI
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      { role: 'model', parts: [{ text: 'Halo! Saya asisten AI Anda. Apa yang bisa saya bantu hari ini? Anda bisa meminta saya untuk membuat draf postingan media sosial, email, ide-ide, atau apa pun yang Anda butuhkan.' }] }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  // State untuk Prompt Video VEO
  const [veoFile, setVeoFile] = useState<File | null>(null);
  const [veoPreviewUrl, setVeoPreviewUrl] = useState<string | null>(null);
  const [isGeneratingVeoPrompt, setIsGeneratingVeoPrompt] = useState<boolean>(false);
  const [veoPrompts, setVeoPrompts] = useState<string>('');
  const [veoCopySuccess, setVeoCopySuccess] = useState<boolean>(false);

  // State untuk Generator Teks
  const [textCategory, setTextCategory] = useState<TextCategory>('Motivasi');
  const [generatedTexts, setGeneratedTexts] = useState<GeneratedText[]>([]);
  const [isGeneratingTexts, setIsGeneratingTexts] = useState<boolean>(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setTempApiKey(savedApiKey);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
        });
        setChatSession(chat);
      } catch (err) {
        setError("API Key tidak valid atau terjadi kesalahan saat inisialisasi.");
        setChatSession(null);
      }
    } else {
        setChatSession(null);
    }
  }, [apiKey]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      handleGenerateMetadata(file);
      return () => URL.revokeObjectURL(url);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);
  
  useEffect(() => {
    if (veoFile) {
        const url = URL.createObjectURL(veoFile);
        setVeoPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    } else {
        setVeoPreviewUrl(null);
    }
  }, [veoFile]);


  useEffect(() => {
    const newUrls = imagesToEdit.map(file => file ? URL.createObjectURL(file) : null);
    setImageToEditUrls(newUrls);

    return () => {
      newUrls.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagesToEdit]);
  
  useEffect(() => {
    if (generatedMetadata) {
      setEditableMetadata({
        title: generatedMetadata.titles[0] || '',
        description: generatedMetadata.descriptions[0] || '',
        hashtags: generatedMetadata.hashtags.map(h => `#${h}`).join(' '),
        cta: generatedMetadata.cta || '',
        location: generatedMetadata.location || '',
      });
    }
  }, [generatedMetadata]);

  const handleSaveApiKey = () => {
    localStorage.setItem('geminiApiKey', tempApiKey);
    setApiKey(tempApiKey);
    alert('API Key disimpan!');
  };
  
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setGeneratedMetadata(null);
    setImagePrompt('');
    setImageToVideoResult(null);
    setVeoPrompts('');
    setToneAnalysisResult(null);
    setRepurposingIdeas(null);
    setError(null);
  };

  const handleGenerateMetadata = async (mediaFile: File) => {
    if (!apiKey) {
      setError('Silakan masukkan API Key Gemini Anda di header.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const metadata = await generateFacebookMetadata(mediaFile, apiKey);
      setGeneratedMetadata(metadata);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReactions = async () => {
    if (!file || !apiKey) return;
    setIsGeneratingReactions(true);
    setError(null);
    try {
      const captions = await generateReactionCaption(file, reactionStyle, outputLength, includeHashtags, apiKey);
      setGeneratedMetadata(prev => {
        const newMeta = { ...(prev || { titles: [], descriptions: [], hashtags: [], cta: '', location: '' }), descriptions: captions };
        setEditableMetadata(prevEdit => ({ ...prevEdit, description: captions[0] || '' }));
        return newMeta;
      });
    } catch (err: any) {
      setError(err.message || "Gagal menghasilkan caption reaksi.");
    } finally {
      setIsGeneratingReactions(false);
    }
  };
  
  const handleGeneratePrompt = async () => {
    if (!file || !apiKey) return;
    setIsGeneratingPrompt(true);
    setError(null);
    try {
      const prompt = await generateImagePrompt(file, apiKey);
      setImagePrompt(prompt);
    } catch (err: any) {
      setError(err.message || "Gagal menghasilkan prompt gambar.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateImageToVideoPrompt = async () => {
    if (!file || !file.type.startsWith('image/') || !apiKey) return;
    setIsGeneratingImageToVideoPrompt(true);
    setError(null);
    try {
      const result = await generateImageToVideoPrompt(file, apiKey);
      setImageToVideoResult(result);
    } catch (err: any) {
      setError(err.message || "Gagal menghasilkan prompt gambar-ke-video.");
    } finally {
      setIsGeneratingImageToVideoPrompt(false);
    }
  };

  const handleGenerateVeoPrompts = async () => {
    if (!veoFile || !apiKey) return;
    setIsGeneratingVeoPrompt(true);
    setError(null);
    try {
      const prompts = await generateVeoVideoPrompts(veoFile, apiKey);
      const formattedPrompts = JSON.stringify(prompts, null, 2);
      setVeoPrompts(formattedPrompts);
    } catch (err: any) {
      setError(err.message || "Gagal menghasilkan prompt video VEO.");
    } finally {
      setIsGeneratingVeoPrompt(false);
    }
  };
  
  const handleAnalyzeToneAndAudience = async () => {
    if (!file || !apiKey) return;
    setIsAnalyzingTone(true);
    setError(null);
    try {
      const result = await analyzeToneAndAudience(file, apiKey);
      setToneAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || "Gagal menganalisis nada dan audiens.");
    } finally {
      setIsAnalyzingTone(false);
    }
  };

  const handleGenerateRepurposingIdeas = async () => {
    if (!file || !apiKey) return;
    setIsGeneratingRepurposing(true);
    setError(null);
    try {
      const ideas = await generateRepurposingIdeas(file, editableMetadata.description, apiKey);
      setRepurposingIdeas(ideas);
    } catch (err: any) {
      setError(err.message || "Gagal menghasilkan ide konten lintas platform.");
    } finally {
      setIsGeneratingRepurposing(false);
    }
  };

  const handleMetadataChange = (field: keyof EditableMetadata, value: string) => {
    setEditableMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyAll = () => {
    const fullText = [editableMetadata.title, editableMetadata.description, editableMetadata.cta, editableMetadata.hashtags].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyPrompt = (textToCopy: string, setSuccess: (s: boolean) => void) => {
    navigator.clipboard.writeText(textToCopy);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleGenerateQuotes = async () => {
    if (!apiKey) {
      setError('Silakan masukkan API Key Gemini Anda di header.');
      return;
    }
    setIsGeneratingQuotes(true);
    setError(null);
    setGeneratedQuotes([]);
    try {
      const quotes = await generateQuotes(quoteCategory, apiKey);
      setGeneratedQuotes(quotes);
    } catch (err: any) {
      setError(err.message || 'Gagal menghasilkan kutipan.');
    } finally {
      setIsGeneratingQuotes(false);
    }
  };

  const handleDownloadQuote = (quote: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 1080;
    const height = 1920;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    // Latar belakang
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Teks Kutipan
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let line = '';
      let testLine;
      const lines = [];

      for (let n = 0; n < words.length; n++) {
        testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      
      const totalHeight = lines.length * lineHeight;
      let startY = y - (totalHeight / 2);

      for(let i=0; i<lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, startY + (i * lineHeight));
      }
    };
    
    ctx.font = `bold ${width / 15}px "Times New Roman", serif`;
    wrapText(quote, width / 2, height / 2 - 50, width - 200, width / 14);

    ctx.font = `italic ${width / 30}px "Times New Roman", serif`;
    ctx.fillText('–vdmax', width / 2, height / 2 + 100);

    const link = document.createElement('a');
    link.download = `kutipan-${quote.substring(0, 15).replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  
  const handleGenerateImage = async () => {
    if (!imageGenPrompt || !apiKey) {
      setError('Prompt dan API Key diperlukan untuk membuat gambar.');
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setError(null);
    try {
      const imageUrl = await generateImageWithImagen(imageGenPrompt, imageAspectRatio, apiKey);
      setGeneratedImageUrl(imageUrl);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat gambar.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSetImageToEdit = (file: File, index: number) => {
    setImagesToEdit(prev => {
      const newImages = [...prev];
      newImages[index] = file;
      return newImages;
    });
  };

  const handleEditImage = async () => {
    const mainImage = imagesToEdit[0];
    if (!mainImage || !imageEditPrompt || !apiKey) {
        setError('Gambar utama, prompt, dan API Key diperlukan untuk mengedit gambar.');
        return;
    }

    const filesToUpload = imagesToEdit.filter(f => f !== null) as File[];

    setIsEditingImage(true);
    setEditedImageUrl(null);
    setError(null);
    try {
        const imageUrl = await editImageWithGemini(filesToUpload, imageEditPrompt, apiKey);
        setEditedImageUrl(imageUrl);
    } catch (err: any) {
        setError(err.message || 'Gagal mengedit gambar.');
    } finally {
        setIsEditingImage(false);
    }
  };

  const handleGetPromptSuggestions = async () => {
    if (!apiKey) return;
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await generateImagePromptSuggestions(apiKey);
      setPromptSuggestions(suggestions);
    } catch (err: any) {
      setError(err.message || 'Gagal mendapatkan saran prompt.');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleDownloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const handleGenerateEnglishTexts = async () => {
    if (!apiKey) {
      setError('Silakan masukkan API Key Gemini Anda di header.');
      return;
    }
    setIsGeneratingTexts(true);
    setError(null);
    setGeneratedTexts([]);
    try {
      const texts = await generateEnglishText(textCategory, apiKey);
      setGeneratedTexts(texts);
    } catch (err: any) {
      setError(err.message || 'Gagal menghasilkan teks bilingual.');
    } finally {
      setIsGeneratingTexts(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here if desired
  };
  
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSession || isChatting) return;

    const userMessage = chatInput;
    setChatInput('');
    setIsChatting(true);
    setError(null);

    setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: userMessage }] }]);
    setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

    try {
        const stream = await chatSession.sendMessageStream({ message: userMessage });
        
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            setChatHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1].parts[0].text += chunkText;
                return newHistory;
            });
        }
    } catch (err: any) {
         setError(err.message || 'Gagal berkomunikasi dengan AI.');
         setChatHistory(prev => prev.slice(0, -1));
    } finally {
        setIsChatting(false);
    }
  };

  const isAnyActionDisabled = !file || !apiKey;
  

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center flex-wrap gap-y-2">
          <div className="flex items-center space-x-3">
             <SparklesIcon className="w-8 h-8 text-indigo-500"/>
             <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">AI Content Suite</h1>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-grow">
              <KeyIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type="password" placeholder="API Key Gemini Anda" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} className="w-full pl-10 pr-20 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <button onClick={handleSaveApiKey} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg">Simpan</button>
          </div>
        </div>
        <nav className="container mx-auto px-4 flex border-t border-slate-200 dark:border-slate-700/50 overflow-x-auto">
            <button onClick={() => setActiveTab('content')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'content' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <FacebookIcon className="w-5 h-5 mr-2" /> Generator Konten
            </button>
            <button onClick={() => setActiveTab('quotes')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'quotes' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <QuoteIcon className="w-5 h-5 mr-2" /> Generator Kutipan
            </button>
             <button onClick={() => setActiveTab('image')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'image' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <ImageIcon className="w-5 h-5 mr-2" /> Generator Gambar
            </button>
            <button onClick={() => setActiveTab('videoToVeo')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'videoToVeo' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <VideoIcon className="w-5 h-5 mr-2" /> Prompt Video VEO
            </button>
            <button onClick={() => setActiveTab('chat')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'chat' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <ChatBubbleIcon className="w-5 h-5 mr-2" /> Asisten AI
            </button>
            <button onClick={() => setActiveTab('text')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'text' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <QuoteIcon className="w-5 h-5 mr-2" /> Generator Teks
            </button>
        </nav>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {error && (<div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert"><p className="font-bold">Kesalahan</p><p>{error}</p></div>)}
        
        {activeTab === 'content' && <ContentGenerator {...{
            apiKey, file, previewUrl, isLoading, handleFileSelect, generatedMetadata, editableMetadata, 
            handleMetadataChange, handleGenerateRepurposingIdeas, isAnyActionDisabled, isGeneratingRepurposing,
            repurposingIdeas, handleAnalyzeToneAndAudience, isAnalyzingTone, toneAnalysisResult, reactionStyle,
            setReactionStyle, outputLength, setOutputLength, includeHashtags, setIncludeHashtags, 
            handleGenerateReactions, isGeneratingReactions, handleGeneratePrompt, isGeneratingPrompt, imagePrompt,
            handleCopyPrompt, setPromptCopySuccess, promptCopySuccess, handleGenerateImageToVideoPrompt,
            isGeneratingImageToVideoPrompt, imageToVideoResult, setSceneCopySuccess, sceneCopySuccess,
            setDialogueCopySuccess, dialogueCopySuccess, copySuccess, handleCopyAll
        }} />}
        {activeTab === 'quotes' && <QuoteGenerator {...{
            apiKey, quoteCategory, setQuoteCategory, handleGenerateQuotes, isGeneratingQuotes, 
            generatedQuotes, handleDownloadQuote
        }} />}
        {activeTab === 'image' && <ImageGenerator {...{
            apiKey, activeImageGenTab, setActiveImageGenTab, imageGenPrompt, setImageGenPrompt, 
            handleGenerateImage, isGeneratingImage, handleGetPromptSuggestions, isGeneratingSuggestions,
            promptSuggestions, generatedImageUrl, handleDownloadDataUrl, imagesToEdit, imageToEditUrls,
            isEditingImage, handleSetImageToEdit, imageEditPrompt, setImageEditPrompt, handleEditImage,
            editedImageUrl, imageAspectRatio, setImageAspectRatio
        }} />}
        {activeTab === 'videoToVeo' && <VideoToVeoGenerator {...{
            apiKey,
            handleGenerate: handleGenerateVeoPrompts,
            isGenerating: isGeneratingVeoPrompt,
            prompts: veoPrompts,
            handleCopy: () => handleCopyPrompt(veoPrompts, setVeoCopySuccess),
            copySuccess: veoCopySuccess,
            setFile: setVeoFile,
            file: veoFile,
            previewUrl: veoPreviewUrl
        }} />}
        {activeTab === 'chat' && <AIChat
            history={chatHistory}
            input={chatInput}
            setInput={setChatInput}
            onSend={handleSendMessage}
            isLoading={isChatting}
            apiKey={apiKey}
        />}
        {activeTab === 'text' && <TextGenerator {...{
            apiKey, textCategory, setTextCategory, handleGenerateEnglishTexts, isGeneratingTexts,
            generatedTexts, handleCopyText
        }} />}

      </main>
    </div>
  );
};

export default App;
