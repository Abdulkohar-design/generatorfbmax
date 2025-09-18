import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { FileUpload } from './components/FileUpload';
import { MetadataForm } from './components/MetadataForm';
import { FacebookPreview } from './components/FacebookPreview';
import { generateFacebookMetadata, generateReactionCaption, generateImagePrompt, generateVeoVideoPrompts, analyzeToneAndAudience, generateImageToVideoPrompt, generateRepurposingIdeas, generateQuotes, generateImageWithImagen, editImageWithGemini, generateImagePromptSuggestions, generateEnglishText, translateText, generateTextForImage } from './services/geminiService';
import type { GeneratedMetadata, EditableMetadata, ReactionStyle, OutputLength, ToneAnalysisResult, RepurposingIdea, ImageToVideoResult, QuoteCategory, ChatMessage, ActiveTab, TextCategory, GeneratedText, TextImageCategory } from './types';
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


// Pre-process text to separate title from content and convert numbered lists to bullets
const PIN_EMOJI = '\u{1F4CC}';
const BULLET_CHAR = '\u2022';

type ProcessedTextBlock = {
  type: 'title' | 'numbered' | 'bullet' | 'paragraph' | 'spacer';
  content: string;
};

function preprocessText(text: string): ProcessedTextBlock[] {
  if (!text) {
    return [];
  }

  const pin = PIN_EMOJI;

  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();

  if (!normalized) {
    return [];
  }

  normalized = normalized.replace(/dY\"O/gi, `${pin} `);
  const pinCleanupRegex = new RegExp(`${pin}\s*`, 'g');
  normalized = normalized.replace(pinCleanupRegex, `${pin} `);

  // Repair missing spaces between uppercase headings and body text (e.g., "KUATBerani")
  normalized = normalized.replace(/([A-Z\u00C0-\u017F]{2,})([A-Z][a-z])/g, '$1 $2');

  if (!normalized.includes('\n')) {
    const firstLowercase = normalized.search(/[a-z\u00C0-\u017F]/u);
    if (firstLowercase > -1) {
      const splitIndex = normalized.lastIndexOf(' ', firstLowercase);
      if (splitIndex > 0) {
        normalized =
          normalized.slice(0, splitIndex).trimEnd() +
          '\n\n' +
          normalized.slice(splitIndex + 1).trimStart();
      }
    }
  }

  normalized = normalized.replace(/(?<!^)(?<!\n)(\d+\.\s+)/g, '\n$1');
  const bulletBreakRegex = new RegExp(`(?<!^)(?<!\\n)([-${BULLET_CHAR}\\*]\s+)`, 'g');
  normalized = normalized.replace(bulletBreakRegex, '\n$1');
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  normalized = normalized.replace(/^\n+/, '').replace(/\n+$/, '');

  const rawLines = normalized.split('\n');
  const cleanedLines: string[] = [];

  const pushSpacer = () => {
    if (cleanedLines.length && cleanedLines[cleanedLines.length - 1] !== '') {
      cleanedLines.push('');
    }
  };

  let index = 0;
  while (index < rawLines.length) {
    const source = rawLines[index];
    const trimmed = source.trim();

    if (!trimmed) {
      pushSpacer();
      index += 1;
      continue;
    }

    const collapsed = trimmed.replace(/\s+/g, ' ');

    const numberOnly = collapsed.match(/^(\d+)\.$/);
    if (numberOnly) {
      let lookahead = index + 1;
      let nextContent = '';
      while (lookahead < rawLines.length) {
        const candidate = rawLines[lookahead].trim();
        if (!candidate) {
          lookahead += 1;
          continue;
        }
        nextContent = candidate.replace(/\s+/g, ' ');
        break;
      }
      if (nextContent) {
        cleanedLines.push(`${numberOnly[1]}. ${nextContent}`);
        index = lookahead + 1;
        continue;
      }
    }

    const bulletOnly = collapsed.match(new RegExp(`^[-${BULLET_CHAR}\*]$`));
    if (bulletOnly) {
      let lookahead = index + 1;
      let nextContent = '';
      while (lookahead < rawLines.length) {
        const candidate = rawLines[lookahead].trim();
        if (!candidate) {
          lookahead += 1;
          continue;
        }
        nextContent = candidate.replace(/\s+/g, ' ');
        break;
      }
      if (nextContent) {
        cleanedLines.push(`${BULLET_CHAR} ${nextContent}`);
        index = lookahead + 1;
        continue;
      }
    }

    cleanedLines.push(collapsed);
    index += 1;
  }

  const blocks: ProcessedTextBlock[] = [];
  let lastType: ProcessedTextBlock['type'] | null = null;

  const isAllCaps = (value: string) => {
    const letters = value.replace(/[^A-Za-z\u00C0-\u017F&\s'-]/g, '').trim();
    return letters && letters === letters.toUpperCase();
  };

  cleanedLines.forEach((line) => {
    if (!line) {
      if (blocks.length && lastType !== 'spacer') {
        blocks.push({ type: 'spacer', content: '' });
        lastType = 'spacer';
      }
      return;
    }

    let content = line;
    if (content.startsWith(pin) && !content.startsWith(`${pin} `)) {
      content = `${pin} ${content.slice(pin.length).trimStart()}`;
    }

    let type: ProcessedTextBlock['type'] = 'paragraph';

    if (content.startsWith(pin)) {
      type = 'title';
    } else if (/^\d+\.\s+/.test(content)) {
      type = 'numbered';
    } else if (new RegExp(`^${BULLET_CHAR}\s+`).test(content) || /^[-\*]\s+/.test(content)) {
      type = 'bullet';
      content = content.replace(/^[-\*]\s+/, `${BULLET_CHAR} `);
      if (!content.startsWith(`${BULLET_CHAR} `)) {
        content = `${BULLET_CHAR} ${content.replace(new RegExp(`^${BULLET_CHAR}\s*`), '')}`;
      }
    } else if (isAllCaps(content)) {
      type = 'title';
    }

    if (type === 'bullet' && !content.startsWith(`${BULLET_CHAR} `)) {
      content = `${BULLET_CHAR} ${content.replace(new RegExp(`^[-${BULLET_CHAR}\*]\s*`), '')}`;
    }

    blocks.push({ type, content });
    lastType = type;
  });

  return blocks;
}



// Main Tab Components (Moved outside App)

const TextPosterCard: React.FC<{
  text: string;
  backgroundColor: string;
  fontFamily: string;
  textColor: string;
  textAlignment: 'left' | 'center' | 'right';
  textPosition: 'top' | 'center' | 'bottom';
  showTextBox: boolean;
  textBoxPadding: number;
  textBoxRadius: number;
  textBoxShadow: boolean;
  onDownload?: () => void;
  badgeLabel?: string;
  downloadAriaLabel?: string;
}> = ({
  text,
  backgroundColor,
  fontFamily,
  textColor,
  textAlignment,
  textPosition,
  showTextBox,
  textBoxPadding,
  textBoxRadius,
  textBoxShadow,
  onDownload,
  badgeLabel,
  downloadAriaLabel,
}) => {
  const processedBlocks = preprocessText(text);
  const hasContent = processedBlocks.length > 0;

  return (
    <div className="relative group">
      <div
        className="aspect-[9/16] w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
        style={{
          backgroundColor,
          fontFamily,
        }}
      >
        {showTextBox && (
          <div
            className="absolute inset-0 rounded-2xl bg-white/90"
            style={{
              margin: `${textBoxPadding}px`,
              borderRadius: `${textBoxRadius}px`,
              boxShadow: textBoxShadow ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
            }}
          />
        )}
        <div
          className="absolute inset-0 flex p-6"
          style={{
            padding: showTextBox ? `${textBoxPadding + 15}px` : '1.5rem',
            textAlign: textAlignment,
            alignItems:
              textPosition === 'top'
                ? 'flex-start'
                : textPosition === 'bottom'
                ? 'flex-end'
                : 'center',
            justifyContent:
              textAlignment === 'center'
                ? 'center'
                : textAlignment === 'right'
                ? 'flex-end'
                : 'flex-start',
          }}
        >
          <div
            className="leading-relaxed whitespace-pre-line w-full"
            style={{
              color: textColor,
              fontFamily,
              fontSize: '1.1rem',
              lineHeight: '1.5',
              maxWidth: '100%',
            }}
          >
            {hasContent
              ? processedBlocks.map((block, i) => {
                  if (block.type === 'spacer') {
                    return <div key={i} className="h-3" aria-hidden="true" />;
                  }

                  if (block.type === 'title') {
                    return (
                      <div key={i} className="font-bold text-lg mb-3 leading-tight">
                        {block.content}
                      </div>
                    );
                  }

                  if (block.type === 'numbered' || block.type === 'bullet') {
                    return (
                      <div key={i} className="font-semibold mb-2 ml-2">
                        {block.content}
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="mb-2">
                      {block.content}
                    </div>
                  );
                })
              : (
                <div className="text-sm text-slate-400 italic text-center">
                  Teks akan ditampilkan di sini.
                </div>
              )}
            <div className="mt-6 text-base opacity-75 font-medium">–vdmax</div>
          </div>
        </div>
      </div>
      {onDownload && (
        <button
          onClick={onDownload}
          className="absolute bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-indigo-700"
          aria-label={downloadAriaLabel ?? 'Unduh poster'}
        >
          <DownloadIcon className="w-6 h-6" />
        </button>
      )}
      {badgeLabel && (
        <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
          {badgeLabel}
        </div>
      )}
    </div>
  );
};

const ContentGenerator: React.FC<any> = ({
    apiKey, file, previewUrl, isLoading, handleFileSelect, generatedMetadata, editableMetadata,
    handleMetadataChange, handleGenerateRepurposingIdeas, isAnyActionDisabled, isGeneratingRepurposing,
    repurposingIdeas, handleAnalyzeToneAndAudience, isAnalyzingTone, toneAnalysisResult, reactionStyle,
    setReactionStyle, outputLength, setOutputLength, includeHashtags, setIncludeHashtags,
    handleGenerateReactions, isGeneratingReactions, handleGeneratePrompt, isGeneratingPrompt, imagePrompt,
    handleCopyPrompt, setPromptCopySuccess, promptCopySuccess, handleGenerateImageToVideoPrompt,
    isGeneratingImageToVideoPrompt, imageToVideoResult, setSceneCopySuccess, sceneCopySuccess,
    setDialogueCopySuccess, dialogueCopySuccess, copySuccess, handleCopyAll
}) => {

  return (
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
};

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

const TextImageGenerator: React.FC<any> = ({
    apiKey, textImageCategory, setTextImageCategory, handleGenerateTextImages, isGeneratingTextImages,
    generatedTextImages, handleDownloadTextImage, manualText, setManualText, useManualText, setUseManualText,
    backgroundColor, setBackgroundColor, textColor, setTextColor, fontFamily, setFontFamily,
    textAlignment, setTextAlignment, textPosition, setTextPosition, showTextBox, setShowTextBox,
    textBoxPadding, setTextBoxPadding, textBoxRadius, setTextBoxRadius, textBoxShadow, setTextBoxShadow
}) => {
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const defaultPreviewText = "?? CONTOH PREVIEW\n\n1. Sesuaikan pengaturan styling.\n2. Klik \"Buat Poster Teks\" untuk melihat hasil.\n3. Gunakan opsi teks manual bila ingin mengatur isi secara langsung.";
    const previewText = useManualText
      ? (manualText.trim() ? manualText : defaultPreviewText)
      : (generatedTextImages[0] ?? defaultPreviewText);
    const isUsingPlaceholder = useManualText ? manualText.trim().length === 0 : generatedTextImages.length === 0;
    const previewHelperMessage = useManualText
      ? 'Preview mengikuti teks manual.'
      : 'Preview akan menampilkan hasil poster pertama setelah teks dihasilkan.';

    return (
        <div className="flex flex-col items-center">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h2 className="text-2xl font-semibold mb-6 text-center">Generator Poster Teks</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Content Input */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="useManualText"
                                checked={useManualText}
                                onChange={(e) => setUseManualText(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="useManualText" className="ml-2 block text-sm text-slate-900 dark:text-slate-200">
                                Gunakan teks manual
                            </label>
                        </div>

                        {useManualText ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Teks Manual</label>
                                <textarea
                                    value={manualText}
                                    onChange={(e) => setManualText(e.target.value)}
                                    placeholder="Masukkan teks yang ingin dijadikan poster dengan format seperti ini:&#10;&#10;📌 5 TANDA SUAMI SERING BERBOHONG PADA ISTRI&#10;&#10;Rezeki terasa seret tanpa sebab jelas.&#10;Uang cepat habis dan tidak tahu kemana perginya.&#10;Banyak urusan yang tiba-tiba dipersulit.&#10;Rumah tangga sering dipenuhi cekcok.&#10;Suami terlihat gelisah dan selalu merasa bersalah.&#10;&#10;Atau dengan format angka:&#10;&#10;📌 5 HAL YANG MEMBUKA PINTU REZEKI&#10;&#10;1. Bersyukur dalam keadaan apapun.&#10;2. Tidak berhenti berusaha meski hasil belum terlihat.&#10;3. Menjaga silaturahmi dengan ikhlas.&#10;4. Tidak memutus doa kepada kedua orang tua.&#10;5. Rajin bersedekah meski hanya sedikit."
                                    rows={6}
                                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Kategori Teks</label>
                                <select
                                    value={textImageCategory}
                                    onChange={(e) => setTextImageCategory(e.target.value as TextImageCategory)}
                                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option>Motivasi</option>
                                    <option>Inspirasi</option>
                                    <option>Humor</option>
                                    <option>Cinta</option>
                                    <option>Kehidupan</option>
                                    <option>Kesuksesan</option>
                                    <option>Persahabatan</option>
                                    <option>Bijak</option>
                                    <option>Renungan</option>
                                    <option>Motivasi Karier</option>
                                    <option>Kesehatan Mental</option>
                                    <option>Lingkungan</option>
                                    <option>Sosial</option>
                                    <option>Teknologi</option>
                                    <option>Bisnis</option>
                                    <option>Pendidikan</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerateTextImages}
                        disabled={!apiKey || isGeneratingTextImages || (useManualText && !manualText.trim())}
                        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                    >
                        {isGeneratingTextImages ? 'Menghasilkan...' : 'Buat Poster Teks'}
                    </button>

                    {!apiKey && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center"><strong>Peringatan:</strong> Masukkan API Key di header untuk menggunakan fitur ini.</p>}
                </div>

                {/* Right Column - Styling Options */}
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preview Langsung</h3>
                        {isUsingPlaceholder && (<span className="text-xs text-slate-500 dark:text-slate-400">Contoh teks</span>)}
                      </div>
                      <div className="flex justify-center">
                        <div className="w-full max-w-md">
                          <TextPosterCard
                            text={previewText}
                            backgroundColor={backgroundColor}
                            fontFamily={fontFamily}
                            textColor={textColor}
                            textAlignment={textAlignment}
                            textPosition={textPosition}
                            showTextBox={showTextBox}
                            textBoxPadding={textBoxPadding}
                            textBoxRadius={textBoxRadius}
                            textBoxShadow={textBoxShadow}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => setShowPreviewModal(true)}
                          className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm"
                        >
                          Lihat Preview Penuh
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                        {previewHelperMessage}
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Pengaturan Styling</h3>

                    {/* Background Settings */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Background</h4>
                        <div className="flex items-center space-x-3">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
                                title="Pilih warna background"
                            />
                            <input
                                type="text"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                                placeholder="#ffffff"
                            />
                        </div>
                    </div>

                    {/* Typography Settings */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Typography</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Font</label>
                                <select
                                    value={fontFamily}
                                    onChange={(e) => setFontFamily(e.target.value)}
                                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Verdana">Verdana</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Warna Teks</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
                                        title="Pilih warna teks"
                                    />
                                    <input
                                        type="text"
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout Settings */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Layout</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Perataan Teks</label>
                                <select
                                    value={textAlignment}
                                    onChange={(e) => setTextAlignment(e.target.value as 'left' | 'center' | 'right')}
                                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                                >
                                    <option value="left">Kiri</option>
                                    <option value="center">Tengah</option>
                                    <option value="right">Kanan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Posisi Teks</label>
                                <select
                                    value={textPosition}
                                    onChange={(e) => setTextPosition(e.target.value as 'top' | 'center' | 'bottom')}
                                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                                >
                                    <option value="top">Atas</option>
                                    <option value="center">Tengah</option>
                                    <option value="bottom">Bawah</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Text Box Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="showTextBox"
                                checked={showTextBox}
                                onChange={(e) => setShowTextBox(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="showTextBox" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                Kotak Teks
                            </label>
                        </div>

                        {showTextBox && (
                            <div className="space-y-3 pl-6 border-l-2 border-slate-200 dark:border-slate-600">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Padding</label>
                                        <input
                                            type="range"
                                            min="20"
                                            max="100"
                                            value={textBoxPadding}
                                            onChange={(e) => setTextBoxPadding(Number(e.target.value))}
                                            className="w-full"
                                        />
                                        <span className="text-xs text-slate-500">{textBoxPadding}px</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Radius</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50"
                                            value={textBoxRadius}
                                            onChange={(e) => setTextBoxRadius(Number(e.target.value))}
                                            className="w-full"
                                        />
                                        <span className="text-xs text-slate-500">{textBoxRadius}px</span>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="textBoxShadow"
                                        checked={textBoxShadow}
                                        onChange={(e) => setTextBoxShadow(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="textBoxShadow" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                        Shadow
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {isGeneratingTextImages && (
            <div className="text-center p-8 space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500">AI sedang membuat poster teks...</p>
            </div>
        )}

        {generatedTextImages.length > 0 && (
            <div className="w-full mt-8">
                <h3 className="text-xl font-semibold mb-6 text-center text-slate-800 dark:text-slate-200">Hasil Poster (4 Varian)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {generatedTextImages.map((text: string, index: number) => (
                        <TextPosterCard
                            key={index}
                            text={text}
                            backgroundColor={backgroundColor}
                            fontFamily={fontFamily}
                            textColor={textColor}
                            textAlignment={textAlignment}
                            textPosition={textPosition}
                            showTextBox={showTextBox}
                            textBoxPadding={textBoxPadding}
                            textBoxRadius={textBoxRadius}
                            textBoxShadow={textBoxShadow}
                            onDownload={() => handleDownloadTextImage(text)}
                            badgeLabel={`#${index + 1}`}
                            downloadAriaLabel={`Unduh poster ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        )}

        {showPreviewModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg max-w-lg w-full mx-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Preview Penuh</h3>
                        <button onClick={() => setShowPreviewModal(false)} className="text-slate-500 hover:text-slate-700 text-2xl">×</button>
                    </div>
                    <div className="flex justify-center">
                        <TextPosterCard
                            text={previewText}
                            backgroundColor={backgroundColor}
                            fontFamily={fontFamily}
                            textColor={textColor}
                            textAlignment={textAlignment}
                            textPosition={textPosition}
                            showTextBox={showTextBox}
                            textBoxPadding={textBoxPadding}
                            textBoxRadius={textBoxRadius}
                            textBoxShadow={textBoxShadow}
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};


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

  // State untuk Generator Gambar Teks
  const [textImageCategory, setTextImageCategory] = useState<TextImageCategory>('Motivasi');
  const [generatedTextImages, setGeneratedTextImages] = useState<string[]>([]);
  const [isGeneratingTextImages, setIsGeneratingTextImages] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [useManualText, setUseManualText] = useState<boolean>(false);

  // Advanced styling options
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [showTextBox, setShowTextBox] = useState<boolean>(true);
  const [textBoxPadding, setTextBoxPadding] = useState<number>(40);
  const [textBoxRadius, setTextBoxRadius] = useState<number>(20);
  const [textBoxShadow, setTextBoxShadow] = useState<boolean>(true);

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

  const handleGenerateTextImages = async () => {
    if (!apiKey) {
      setError('Silakan masukkan API Key Gemini Anda di header.');
      return;
    }
    setIsGeneratingTextImages(true);
    setError(null);
    setGeneratedTextImages([]);
    try {
      let texts: string[];
      if (useManualText && manualText.trim()) {
        // For manual text, generate 4 variations using AI
        const prompt = `Buat 4 variasi konten unik dari teks berikut dengan format yang sama tapi kata-kata yang berbeda. Pertahankan struktur dan gaya penulisan yang sama:

"${manualText.trim()}"

Setiap variasi harus:
- Menggunakan format yang sama (dengan emoji 📌 jika ada)
- Memiliki judul yang berbeda tapi serupa
- Isi yang bervariasi tapi tetap relevan dengan tema
- Panjang yang sama atau serupa

Format hasilnya sebagai array JSON dari string yang sudah diformat lengkap.`;

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: prompt }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                texts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["texts"]
            }
          }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        texts = parsedJson.texts || [manualText.trim()];
      } else {
        texts = await generateTextForImage(textImageCategory, apiKey);
      }
      setGeneratedTextImages(texts);
    } catch (err: any) {
      setError(err.message || 'Gagal menghasilkan teks untuk gambar.');
    } finally {
      setIsGeneratingTextImages(false);
    }
  };

  const handleDownloadTextImage = (text: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 1080;
    const height = 1920;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Text Box (if enabled)
    if (showTextBox) {
      const boxWidth = width - (textBoxPadding * 2);
      const boxHeight = height - (textBoxPadding * 2);
      const boxX = textBoxPadding;
      const boxY = textBoxPadding;

      // Text box background with rounded corners and shadow
      ctx.save();
      if (textBoxShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      roundRect(ctx, boxX, boxY, boxWidth, boxHeight, textBoxRadius);
      ctx.fill();
      ctx.restore();
    }

    // Text formatting and positioning
    ctx.fillStyle = textColor;
    ctx.textAlign = textAlignment as CanvasTextAlign;
    ctx.textBaseline = 'middle';

    // Calculate text position
    let textY;
    switch (textPosition) {
      case 'top':
        textY = height * 0.25;
        break;
      case 'bottom':
        textY = height * 0.75;
        break;
      default:
        textY = height * 0.4;
    }

    // Enhanced text rendering with proper formatting
    const renderFormattedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const processedBlocks = preprocessText(text);
      let currentY = y;

      const getNextType = (index: number) => processedBlocks[index + 1]?.type;

      processedBlocks.forEach((block, index) => {
        const nextType = getNextType(index);

        if (block.type === 'spacer') {
          currentY += lineHeight * 0.9;
          return;
        }

        if (block.type === 'title') {
          ctx.font = `bold ${baseFontSize * 1.2}px "${fontFamily}", sans-serif`;
          ctx.textAlign = 'center';
          const titleLines = wrapTextLine(block.content, maxWidth, ctx);
          titleLines.forEach((titleLine) => {
            ctx.fillText(titleLine, width / 2, currentY);
            currentY += lineHeight * 1.4;
          });
          ctx.font = `400 ${baseFontSize}px "${fontFamily}", sans-serif`;
          ctx.textAlign = textAlignment as CanvasTextAlign;
          currentY += lineHeight * (nextType && nextType !== 'spacer' ? 1.0 : 0.6);
          return;
        }

        if (block.type === 'numbered' || block.type === 'bullet') {
          const isNumbered = block.type === 'numbered';
          ctx.font = `600 ${baseFontSize}px "${fontFamily}", sans-serif`;
          const wrapper = isNumbered ? wrapNumberedLine : wrapBulletLine;
          const listLines = wrapper(block.content, maxWidth - 40, ctx);
          listLines.forEach((listLine, listIndex) => {
            let listX: number;
            switch (textAlignment) {
              case 'left':
                listX = listIndex === 0 ? x + 20 : x + 40;
                break;
              case 'right':
                listX = listIndex === 0 ? x - 20 : x - 40;
                break;
              default:
                listX = x;
            }
            ctx.fillText(listLine, listX, currentY);
            currentY += lineHeight * 1.1;
          });
          ctx.font = `400 ${baseFontSize}px "${fontFamily}", sans-serif`;
          if (nextType === block.type) {
            currentY += lineHeight * 0.7;
          } else if (nextType && nextType !== 'spacer') {
            currentY += lineHeight * 0.9;
          }
          return;
        }

        const textLines = wrapTextLine(block.content, maxWidth, ctx);
        textLines.forEach((textLine) => {
          ctx.fillText(textLine, x, currentY);
          currentY += lineHeight * 1.1;
        });

        if (nextType === 'bullet' || nextType === 'numbered') {
          currentY += lineHeight * 0.6;
        } else if (nextType === 'title') {
          currentY += lineHeight * 0.8;
        } else if (nextType === 'spacer') {
          // spacer handles spacing separately
        } else if (nextType) {
          currentY += lineHeight * 0.4;
        }
      });
    };

    
    // Helper function to wrap individual lines
    const wrapTextLine = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    // Special wrapper for bullet lines to preserve bullets and indent continuation
    const wrapBulletLine = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D) => {
      const bulletMatch = text.match(new RegExp(`^(${BULLET_CHAR}\s*)(.*)$`));
      if (!bulletMatch) {
        return wrapTextLine(text, maxWidth, ctx);
      }

      const bulletPart = bulletMatch[1];
      const contentPart = bulletMatch[2];
      const firstLine = bulletPart + contentPart;

      if (ctx.measureText(firstLine).width <= maxWidth) {
        return [firstLine];
      }

      const contentWords = contentPart.split(' ');
      const lines = [bulletPart + contentWords[0]];
      let currentLine = '';

      for (let i = 1; i < contentWords.length; i++) {
        const word = contentWords[i];
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(bulletPart + testLine).width;

        if (testWidth > maxWidth && currentLine) {
          lines.push('  ' + currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push('  ' + currentLine);
      }

      return lines;
    };

    // Special wrapper for numbered lines to keep the prefix aligned
    const wrapNumberedLine = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D) => {
      const numberMatch = text.match(/^(\d+\.\s*)(.*)$/);
      if (!numberMatch) {
        return wrapTextLine(text, maxWidth, ctx);
      }

      const numberPart = numberMatch[1];
      const contentPart = numberMatch[2];
      const firstLine = numberPart + contentPart;

      if (ctx.measureText(firstLine).width <= maxWidth) {
        return [firstLine];
      }

      const contentWords = contentPart.split(' ');
      const lines = [numberPart + contentWords[0]];
      let currentLine = '';

      for (let i = 1; i < contentWords.length; i++) {
        const word = contentWords[i];
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(numberPart + testLine).width;

        if (testWidth > maxWidth && currentLine) {
          lines.push('  ' + currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push('  ' + currentLine);
      }

      return lines;
    };

    // Set font based on selection
    const baseFontSize = Math.min(width / 20, 48);
    ctx.font = `400 ${baseFontSize}px "${fontFamily}", sans-serif`;

    // Calculate text area based on text box or full canvas
    const textAreaWidth = showTextBox ? width - (textBoxPadding * 4) : width - 200;
    const textAreaX = showTextBox ? width / 2 : width / 2;

    renderFormattedText(text, textAreaX, textY, textAreaWidth, baseFontSize * 1.4);

    // Signature
    ctx.font = `italic ${baseFontSize * 0.6}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('–vdmax', width / 2, height - 100);

    const link = document.createElement('a');
    link.download = `poster-${text.substring(0, 20).replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Helper function for rounded rectangles
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
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
            <button onClick={() => setActiveTab('textImage')} className={`flex-shrink-0 flex items-center px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'textImage' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                <ImageIcon className="w-5 h-5 mr-2" /> Gambar Teks
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
        {activeTab === 'textImage' && <TextImageGenerator {...{
            apiKey, textImageCategory, setTextImageCategory, handleGenerateTextImages, isGeneratingTextImages,
            generatedTextImages, handleDownloadTextImage, manualText, setManualText, useManualText, setUseManualText,
            backgroundColor, setBackgroundColor, textColor, setTextColor, fontFamily, setFontFamily,
            textAlignment, setTextAlignment, textPosition, setTextPosition, showTextBox, setShowTextBox,
            textBoxPadding, setTextBoxPadding, textBoxRadius, setTextBoxRadius, textBoxShadow, setTextBoxShadow
        }} />}

      </main>
    </div>
  );
};

export default App;
