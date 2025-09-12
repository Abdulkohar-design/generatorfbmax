// FIX: Removed self-import which was causing declaration conflicts.

export interface GeneratedMetadata {
  titles: string[];
  descriptions: string[];
  hashtags: string[];
  cta: string;
  location: string;
}

export interface EditableMetadata {
  title: string;
  description: string;
  hashtags: string;
  cta: string;
  location: string;
}

export type ReactionStyle = 'Otomatis' | 'Wow / Kaget' | 'Kagum / Satisfying' | 'Wholesome' | 'Lucu / Sarkas' | 'Mindblown';
export type OutputLength = 'Pendek' | 'Sedang' | 'Panjang';

export interface VeoPromptScene {
  scene_description: string;
  dialogue: string;
}
export type VeoPrompts = VeoPromptScene[];

export interface ToneAnalysisResult {
  tone: string;
  audience: string;
  talkingPoints: string[];
}

export interface RepurposingIdea {
  platform: 'Instagram' | 'TikTok' | 'X' | 'LinkedIn';
  idea: string;
}

export interface ImageToVideoResult {
  scene_description: string;
  dialogue: string;
}

export type QuoteCategory = 'Inspirasi' | 'Cinta' | 'Motivasi' | 'Humor' | 'Renungan' | 'Kesuksesan' | 'Kehidupan' | 'Persahabatan' | 'Bijak' | 'Seni';

export type TextCategory = 'Motivasi' | 'Bisnis' | 'Pendidikan' | 'Kesehatan' | 'Teknologi' | 'Seni & Kreativitas' | 'Hubungan' | 'Kehidupan Sehari-hari' | 'Inspirasi' | 'Humor' | 'Renungan' | 'Karir' | 'Keuangan' | 'Lingkungan' | 'Sosial' | 'Olahraga';

export type TextImageCategory = 'Motivasi' | 'Inspirasi' | 'Humor' | 'Cinta' | 'Kehidupan' | 'Kesuksesan' | 'Persahabatan' | 'Bijak' | 'Renungan' | 'Motivasi Karier' | 'Kesehatan Mental' | 'Lingkungan' | 'Sosial' | 'Teknologi' | 'Bisnis' | 'Pendidikan';

export interface GeneratedText {
  english: string;
  indonesian: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export type ActiveTab = 'content' | 'quotes' | 'image' | 'videoToVeo' | 'chat' | 'text' | 'textImage';
