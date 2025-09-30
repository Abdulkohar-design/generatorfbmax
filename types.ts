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

export type ActiveTab = 'content' | 'quotes' | 'image' | 'videoToVeo' | 'chat' | 'text' | 'textImage' | 'ugc' | 'ugcProduct' | 'spiritual';

export interface UGCContent {
  id: string;
  type: 'text' | 'image' | 'video';
  title: string;
  content: string;
  mediaUrl?: string;
  category: string;
  tags: string[];
  createdAt: string;
  status: 'draft' | 'published' | 'archived';
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
}

export interface UGCUpload {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export interface UGCSettings {
  autoOptimize: boolean;
  suggestedCategories: string[];
  maxFileSize: number;
  allowedFormats: string[];
}

export interface UGCStats {
  totalContent: number;
  publishedContent: number;
  totalEngagement: number;
  averageEngagement: number;
  topCategories: Array<{ category: string; count: number; engagement: number }>;
}

// UGC Product Generator Types
export type ProductCategory = 'fashion' | 'small_product' | 'beauty_cosmetics' | 'lifestyle';
export type ModelGender = 'male' | 'female';
export type PoseStyle = 'casual' | 'dynamic' | 'elegant' | 'interactive';
export type CameraAngle = 'eye_level' | 'low_angle' | 'high_angle';
export type Composition = 'full_body' | 'medium_shot' | 'close_up';

export interface ProductVibe {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  preview: string;
}

export interface UGCProductSettings {
  productCategory: ProductCategory;
  modelGender: ModelGender;
  poseStyle: PoseStyle;
  cameraAngle: CameraAngle;
  composition: Composition;
  selectedVibe: string;
  numberOfImages: number;
  generateVideo: boolean;
  videoDuration: number;
}

export interface GeneratedProductImage {
  id: string;
  url: string;
  vibe: string;
  settings: UGCProductSettings;
  createdAt: string;
}

export interface UGCProductContent {
  id: string;
  productImage: string;
  productName: string;
  productCategory: ProductCategory;
  generatedImages: GeneratedProductImage[];
  generatedVideo?: string;
  caption: string;
  hashtags: string[];
  createdAt: string;
  status: 'generating' | 'completed' | 'failed';
}

// Spiritual Content Generator Types
export type SpiritualTheme = 'parental_love' | 'faith_prayer' | 'life_struggles' | 'gratitude' | 'family_bond' | 'perseverance' | 'hope' | 'sacrifice' | 'wisdom' | 'reflection';

export interface SpiritualContent {
  id: string;
  title: string;
  content: string;
  theme: SpiritualTheme;
  mood: 'melancholic' | 'hopeful' | 'grateful' | 'reflective' | 'emotional' | 'inspiring';
  length: 'short' | 'medium' | 'long';
  includeReligiousText: boolean;
  religiousText?: string;
  hashtags: string[];
  createdAt: string;
}

export interface SpiritualSettings {
  theme: SpiritualTheme;
  mood: 'melancholic' | 'hopeful' | 'grateful' | 'reflective' | 'emotional' | 'inspiring';
  length: 'short' | 'medium' | 'long';
  includeReligiousText: boolean;
  customPrompt?: string;
  targetAudience: 'general' | 'parents' | 'youth' | 'elderly' | 'families';
}
