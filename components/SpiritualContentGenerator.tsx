import React, { useState } from 'react';
import { generateSpiritualContent, generateSpiritualContentVariations } from '../services/geminiService';
import type { SpiritualSettings, SpiritualContent, SpiritualTheme } from '../types';
import { CopyIcon, DownloadIcon, SparklesIcon, HeartIcon, BookOpenIcon, UsersIcon, ClockIcon, TagIcon } from './icons';
import { useToast } from './ToastProvider';
import { ApiKeyNotice } from './ApiKeyNotice';

interface SpiritualContentGeneratorProps {
  apiKey: string;
}

const THEME_OPTIONS: { value: SpiritualTheme; label: string; description: string; emoji: string }[] = [
  { value: 'parental_love', label: 'Cinta Orang Tua', description: 'Pengorbanan dan cinta kasih orang tua', emoji: '👨‍👩‍👧‍👦' },
  { value: 'faith_prayer', label: 'Iman & Doa', description: 'Kepercayaan dan spiritualitas', emoji: '🤲' },
  { value: 'life_struggles', label: 'Perjuangan Hidup', description: 'Kesulitan dan ketabahan', emoji: '💪' },
  { value: 'gratitude', label: 'Rasa Syukur', description: 'Penghargaan dan kebahagiaan', emoji: '🙏' },
  { value: 'family_bond', label: 'Ikatan Keluarga', description: 'Hubungan antar anggota keluarga', emoji: '❤️' },
  { value: 'perseverance', label: 'Ketekunan', description: 'Pantang menyerah dan semangat juang', emoji: '🔥' },
  { value: 'hope', label: 'Harapan', description: 'Optimisme dan keyakinan masa depan', emoji: '✨' },
  { value: 'sacrifice', label: 'Pengorbanan', description: 'Kerelaan berkorban untuk orang lain', emoji: '🕊️' },
  { value: 'wisdom', label: 'Kebijaksanaan', description: 'Pelajaran hidup dan nasihat', emoji: '🧠' },
  { value: 'reflection', label: 'Perenungan', description: 'Introspeksi dan kontemplasi', emoji: '🌙' }
];

const MOOD_OPTIONS: { value: SpiritualContent['mood']; label: string; description: string; emoji: string }[] = [
  { value: 'melancholic', label: 'Melankolis', description: 'Sedih dan mengharukan', emoji: '😢' },
  { value: 'hopeful', label: 'Penuh Harapan', description: 'Optimis dan membangkitkan semangat', emoji: '🌟' },
  { value: 'grateful', label: 'Bersyukur', description: 'Penuh rasa terima kasih', emoji: '🙏' },
  { value: 'reflective', label: 'Reflektif', description: 'Renungan mendalam', emoji: '🤔' },
  { value: 'emotional', label: 'Emosional', description: 'Sangat mengharukan', emoji: '💔' },
  { value: 'inspiring', label: 'Menginspirasi', description: 'Memotivasi dan membangkitkan semangat', emoji: '💫' }
];

const LENGTH_OPTIONS: { value: SpiritualContent['length']; label: string; description: string; wordCount: string }[] = [
  { value: 'short', label: 'Pendek', description: '2-3 paragraf', wordCount: '150-250 kata' },
  { value: 'medium', label: 'Sedang', description: '4-6 paragraf', wordCount: '300-500 kata' },
  { value: 'long', label: 'Panjang', description: '7-10 paragraf', wordCount: '600-1000 kata' }
];

const AUDIENCE_OPTIONS: { value: SpiritualSettings['targetAudience']; label: string; description: string; emoji: string }[] = [
  { value: 'general', label: 'Umum', description: 'Untuk semua kalangan', emoji: '👥' },
  { value: 'parents', label: 'Orang Tua', description: 'Khusus untuk para orang tua', emoji: '👨‍👩‍👧‍👦' },
  { value: 'youth', label: 'Generasi Muda', description: 'Untuk generasi muda', emoji: '👦👧' },
  { value: 'elderly', label: 'Lansia', description: 'Untuk lansia', emoji: '👴👵' },
  { value: 'families', label: 'Keluarga', description: 'Untuk keluarga', emoji: '🏠' }
];

export const SpiritualContentGenerator: React.FC<SpiritualContentGeneratorProps> = ({ apiKey }) => {
  const [settings, setSettings] = useState<SpiritualSettings>({
    theme: 'parental_love',
    mood: 'emotional',
    length: 'long',
    includeReligiousText: true,
    targetAudience: 'general'
  });

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<SpiritualContent | null>(null);
  const [variations, setVariations] = useState<SpiritualContent[]>([]);
  const [showVariations, setShowVariations] = useState<boolean>(false);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState<boolean>(false);

  const toast = useToast();

  const handleGenerate = async () => {
    if (!apiKey) {
      toast.error('API Key Gemini diperlukan untuk menggunakan fitur ini.');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    setVariations([]);
    setShowVariations(false);

    try {
      const content = await generateSpiritualContent(
        { ...settings, customPrompt: customPrompt || undefined },
        apiKey
      );
      setGeneratedContent(content);
      toast.success('Konten spiritual berhasil dihasilkan!');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghasilkan konten spiritual.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!generatedContent || !apiKey) return;

    setIsGeneratingVariations(true);
    try {
      const newVariations = await generateSpiritualContentVariations(generatedContent, apiKey);
      setVariations(newVariations);
      setShowVariations(true);
      toast.success('Variasi konten berhasil dihasilkan!');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghasilkan variasi konten.');
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Konten berhasil disalin!');
  };

  const handleDownloadContent = (content: SpiritualContent) => {
    const textContent = `${content.title}\n\n${content.content}\n\n${content.hashtags.join(' ')}`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `konten-spiritual-${content.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Konten berhasil diunduh!');
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-3 leading-relaxed">
        {paragraph}
      </p>
    ));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
          <HeartIcon className="w-8 h-8 text-red-500" />
          Generator Konten Spiritual
        </h2>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Buat konten spiritual yang panjang, emosional, dan menyentuh hati seperti cerita kehidupan di media sosial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-indigo-500" />
              1. Pilih Tema
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setSettings({ ...settings, theme: theme.value })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    settings.theme === theme.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{theme.emoji}</div>
                  <div className="text-sm font-medium">{theme.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{theme.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <HeartIcon className="w-5 h-5 text-pink-500" />
              2. Pilih Mood
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSettings({ ...settings, mood: mood.value })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    settings.mood === mood.value
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-pink-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{mood.emoji}</div>
                  <div className="text-sm font-medium">{mood.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{mood.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Length Selection */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-green-500" />
              3. Panjang Konten
            </h3>
            <div className="space-y-3">
              {LENGTH_OPTIONS.map((length) => (
                <button
                  key={length.value}
                  onClick={() => setSettings({ ...settings, length: length.value })}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    settings.length === length.value
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{length.label}</div>
                      <div className="text-sm text-slate-500">{length.description}</div>
                    </div>
                    <div className="text-xs text-slate-400">{length.wordCount}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Audience Selection */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-blue-500" />
              4. Target Audiens
            </h3>
            <div className="space-y-3">
              {AUDIENCE_OPTIONS.map((audience) => (
                <button
                  key={audience.value}
                  onClick={() => setSettings({ ...settings, targetAudience: audience.value })}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    settings.targetAudience === audience.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{audience.emoji}</div>
                    <div>
                      <div className="font-medium">{audience.label}</div>
                      <div className="text-sm text-slate-500">{audience.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-500" />
              5. Opsi Tambahan
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeReligiousText"
                  checked={settings.includeReligiousText}
                  onChange={(e) => setSettings({ ...settings, includeReligiousText: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="includeReligiousText" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Sertakan teks keagamaan (ayat Al-Quran, doa, kata-kata bijak)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Konteks Khusus (Opsional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Contoh: tentang seorang ibu yang berjuang sendirian, tentang kehilangan orang tua, dll."
                  rows={3}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Membuat Konten Spiritual...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Buat Konten Spiritual
                </>
              )}
            </button>

            {!apiKey && <ApiKeyNotice className="text-xs mt-2 text-center" message="Masukkan API Key Gemini untuk menggunakan fitur ini." />}
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {isGenerating && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-600 dark:text-slate-400">
                  🤖 AI sedang membuat konten spiritual yang emosional...
                </p>
                <p className="text-sm text-slate-500">
                  Menganalisis tema → Menulis konten panjang → Menambahkan elemen emosional
                </p>
              </div>
            </div>
          )}

          {generatedContent && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Konten Spiritual</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyContent(generatedContent.content)}
                    className="p-2 text-slate-400 hover:text-indigo-500 transition"
                    title="Salin konten"
                  >
                    <CopyIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownloadContent(generatedContent)}
                    className="p-2 text-slate-400 hover:text-indigo-500 transition"
                    title="Unduh konten"
                  >
                    <DownloadIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    {generatedContent.title}
                  </h4>
                  <div className="text-slate-700 dark:text-slate-300">
                    {formatContent(generatedContent.content)}
                  </div>
                </div>

                {generatedContent.religiousText && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h5 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Teks Keagamaan:</h5>
                    <p className="text-yellow-700 dark:text-yellow-400 italic">{generatedContent.religiousText}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {generatedContent.hashtags.map((hashtag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded"
                    >
                      {hashtag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleGenerateVariations}
                    disabled={isGeneratingVariations}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition disabled:opacity-50"
                  >
                    {isGeneratingVariations ? (
                      <>
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Membuat Variasi...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        Buat Variasi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showVariations && variations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Variasi Konten</h3>
              {variations.map((variation, index) => (
                <div key={variation.id} className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Variasi {index + 1}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyContent(variation.content)}
                        className="p-2 text-slate-400 hover:text-indigo-500 transition"
                        title="Salin konten"
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownloadContent(variation)}
                        className="p-2 text-slate-400 hover:text-indigo-500 transition"
                        title="Unduh konten"
                      >
                        <DownloadIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                        {variation.title}
                      </h5>
                      <div className="text-slate-700 dark:text-slate-300">
                        {formatContent(variation.content)}
                      </div>
                    </div>

                    {variation.religiousText && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h6 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Teks Keagamaan:</h6>
                        <p className="text-yellow-700 dark:text-yellow-400 italic">{variation.religiousText}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {variation.hashtags.map((hashtag, hashtagIndex) => (
                        <span
                          key={hashtagIndex}
                          className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded"
                        >
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
