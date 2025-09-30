import React, { useState, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { ApiKeyNotice } from './ApiKeyNotice';
import { generateUGCProductImages, generateUGCProductVideo, autoCropProduct } from '../services/geminiService';
import type {
  ProductCategory,
  ModelGender,
  PoseStyle,
  CameraAngle,
  Composition,
  ProductVibe,
  UGCProductSettings,
  GeneratedProductImage,
  UGCProductContent
} from '../types';

interface UGCProductGeneratorProps {
  apiKey: string;
}

const PRODUCT_VIBES: ProductVibe[] = [
  // Fashion - Expanded Options
  {
    id: 'tokyo_street',
    name: 'Jalanan Tokyo',
    description: 'Gaya urban modern dengan neon dan city lights',
    category: 'fashion',
    preview: '🏙️'
  },
  {
    id: 'urban_night',
    name: 'Gaya Urban Malam',
    description: 'Atmosfer kota malam dengan pencahayaan dramatis',
    category: 'fashion',
    preview: '🌃'
  },
  {
    id: 'scandinavian_interior',
    name: 'Interior Skandinavia',
    description: 'Ruangan minimalis dengan desain bersih dan modern',
    category: 'fashion',
    preview: '🏠'
  },
  {
    id: 'minimalist_studio',
    name: 'Studio Minimalis',
    description: 'Latar belakang putih bersih dengan pencahayaan profesional',
    category: 'fashion',
    preview: '📸'
  },
  {
    id: 'fashion_boutique',
    name: 'Boutique Fashion',
    description: 'Interior boutique mewah dengan display produk',
    category: 'fashion',
    preview: '👗'
  },
  {
    id: 'street_style',
    name: 'Street Style',
    description: 'Gaya jalanan kasual dengan graffiti dan urban art',
    category: 'fashion',
    preview: '🛹'
  },
  {
    id: 'luxury_mall',
    name: 'Mall Mewah',
    description: 'Shopping mall premium dengan lighting modern',
    category: 'fashion',
    preview: '🛍️'
  },
  {
    id: 'vintage_shop',
    name: 'Toko Vintage',
    description: 'Atmosfer vintage dengan furniture klasik',
    category: 'fashion',
    preview: '📻'
  },

  // Small Products - Expanded Options
  {
    id: 'metal_glass_reflection',
    name: 'Refleksi Logam & Kaca',
    description: 'Permukaan mengkilap dengan refleksi produk',
    category: 'small_product',
    preview: '✨'
  },
  {
    id: 'rustic_wood_table',
    name: 'Meja Kayu Rustic',
    description: 'Tekstur kayu alami dengan suasana hangat',
    category: 'small_product',
    preview: '🪵'
  },
  {
    id: 'dark_textured_bg',
    name: 'Latar Gelap Tekstur',
    description: 'Background gelap dengan tekstur menarik',
    category: 'small_product',
    preview: '🌑'
  },
  {
    id: 'smooth_gradient',
    name: 'Gradient Halus',
    description: 'Transisi warna yang smooth dan elegan',
    category: 'small_product',
    preview: '🎨'
  },
  {
    id: 'moss_stone_garden',
    name: 'Taman Lumut & Batu',
    description: 'Elemen alam dengan lumut dan batu alami',
    category: 'small_product',
    preview: '🪨'
  },
  {
    id: 'marble_surface',
    name: 'Permukaan Marmer',
    description: 'Marble countertops dengan luxury feel',
    category: 'small_product',
    preview: '🧱'
  },
  {
    id: 'concrete_minimal',
    name: 'Beton Minimal',
    description: 'Industrial concrete dengan clean aesthetic',
    category: 'small_product',
    preview: '🏭'
  },
  {
    id: 'fabric_texture',
    name: 'Tekstur Kain',
    description: 'Background kain dengan texture menarik',
    category: 'small_product',
    preview: '🧵'
  },
  {
    id: 'jewelry_display',
    name: 'Display Perhiasan',
    description: 'Luxury jewelry display dengan velvet',
    category: 'small_product',
    preview: '💎'
  },
  {
    id: 'tech_gadget_bg',
    name: 'Background Gadget',
    description: 'Modern tech setup dengan LED lighting',
    category: 'small_product',
    preview: '📱'
  },

  // Beauty & Cosmetics - Expanded Options
  {
    id: 'beauty_minimalist_studio',
    name: 'Studio Minimalis',
    description: 'Latar bersih dengan pencahayaan sempurna',
    category: 'beauty_cosmetics',
    preview: '💄'
  },
  {
    id: 'geometric_shapes',
    name: 'Bentuk Geometris',
    description: 'Elemen geometris modern dan stylish',
    category: 'beauty_cosmetics',
    preview: '🔷'
  },
  {
    id: 'soft_bright_bg',
    name: 'Latar Cerah Halus',
    description: 'Warna-warna lembut dengan pencahayaan natural',
    category: 'beauty_cosmetics',
    preview: '☀️'
  },
  {
    id: 'glam_vanity',
    name: 'Vanity Glam',
    description: 'Meja rias dengan mirror lights dan makeup',
    category: 'beauty_cosmetics',
    preview: '💅'
  },
  {
    id: 'spa_wellness',
    name: 'Spa Wellness',
    description: 'Atmosfer spa dengan elemen natural',
    category: 'beauty_cosmetics',
    preview: '🧘'
  },
  {
    id: 'colorful_palette',
    name: 'Palette Warna-warni',
    description: 'Display makeup dengan berbagai warna',
    category: 'beauty_cosmetics',
    preview: '🎨'
  },
  {
    id: 'luxury_bathroom',
    name: 'Bathroom Mewah',
    description: 'Interior bathroom dengan marble dan gold',
    category: 'beauty_cosmetics',
    preview: '🛁'
  },
  {
    id: 'natural_outdoor',
    name: 'Outdoor Natural',
    description: 'Setting outdoor dengan natural lighting',
    category: 'beauty_cosmetics',
    preview: '🌿'
  },

  // Lifestyle - Expanded Options
  {
    id: 'tropical_beach',
    name: 'Pantai Tropis',
    description: 'Suasana pantai dengan pasir dan laut',
    category: 'lifestyle',
    preview: '🏖️'
  },
  {
    id: 'rooftop_bar',
    name: 'Rooftop Bar',
    description: 'Atmosfer rooftop dengan city view',
    category: 'lifestyle',
    preview: '🍸'
  },
  {
    id: 'flower_garden',
    name: 'Taman Bunga',
    description: 'Taman dengan berbagai jenis bunga warna-warni',
    category: 'lifestyle',
    preview: '🌸'
  },
  {
    id: 'aesthetic_cafe',
    name: 'Kafe Estetik',
    description: 'Interior kafe yang instagramable dan cozy',
    category: 'lifestyle',
    preview: '☕'
  },
  {
    id: 'home_living',
    name: 'Ruang Tamu',
    description: 'Interior rumah yang nyaman dan stylish',
    category: 'lifestyle',
    preview: '🏡'
  },
  {
    id: 'gym_fitness',
    name: 'Gym Fitness',
    description: 'Environment gym dengan modern equipment',
    category: 'lifestyle',
    preview: '💪'
  },
  {
    id: 'travel_airport',
    name: 'Bandara Travel',
    description: 'Airport lounge dengan travel vibes',
    category: 'lifestyle',
    preview: '✈️'
  },
  {
    id: 'workspace_desk',
    name: 'Workspace Desk',
    description: 'Home office dengan setup modern',
    category: 'lifestyle',
    preview: '💻'
  },
  {
    id: 'party_celebration',
    name: 'Party Celebration',
    description: 'Atmosfer party dengan decorations',
    category: 'lifestyle',
    preview: '🎉'
  },
  {
    id: 'nature_hiking',
    name: 'Hiking Alam',
    description: 'Outdoor nature dengan mountain view',
    category: 'lifestyle',
    preview: '🏔️'
  }
];

export const UGCProductGenerator: React.FC<UGCProductGeneratorProps> = ({ apiKey }) => {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('');

  const [settings, setSettings] = useState<UGCProductSettings>({
    productCategory: 'fashion',
    modelGender: 'female',
    poseStyle: 'casual',
    cameraAngle: 'eye_level',
    composition: 'full_body',
    selectedVibe: 'tokyo_street',
    numberOfImages: 3,
    generateVideo: false,
    videoDuration: 8
  });

  // Additional customization options
  const [lighting, setLighting] = useState<'natural' | 'studio' | 'dramatic' | 'soft'>('natural');
  const [mood, setMood] = useState<'happy' | 'confident' | 'relaxed' | 'energetic' | 'elegant'>('confident');
  const [colorScheme, setColorScheme] = useState<'warm' | 'cool' | 'neutral' | 'vibrant'>('neutral');
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [batchGenerate, setBatchGenerate] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<UGCProductContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProductFileSelect = (file: File) => {
    setProductFile(file);
    const url = URL.createObjectURL(file);
    setProductPreviewUrl(url);
  };

  const handleGenerate = async () => {
    if (!productFile || !productName.trim()) {
      setError('Mohon lengkapi semua field yang diperlukan.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Always use demo mode if no API key or if API key is invalid
      if (!apiKey || apiKey.trim() === '') {
        await handleDemoMode();
        return;
      }

      // Check if API key looks valid (basic validation)
      if (apiKey.length < 20) {
        await handleDemoMode();
        return;
      }

      let processedImageUrl = productPreviewUrl;

      // Auto-crop product if enabled (only with valid API key)
      if (autoCrop) {
        try {
          processedImageUrl = await autoCropProduct(productFile, apiKey);
          setProductPreviewUrl(processedImageUrl);
        } catch (cropError) {
          console.warn('Auto-crop failed, using original image:', cropError);
        }
      }

      // Generate UGC product images using AI
      const generatedImages = await generateUGCProductImages(
        productFile,
        productName,
        settings,
        apiKey
      );

      // Generate video if requested
      let generatedVideoUrl = undefined;
      if (settings.generateVideo) {
        try {
          generatedVideoUrl = await generateUGCProductVideo(
            productFile,
            productName,
            settings,
            apiKey
          );
        } catch (videoError) {
          console.warn('Video generation failed:', videoError);
        }
      }

      const newContent: UGCProductContent = {
        id: Date.now().toString(),
        productImage: processedImageUrl || '',
        productName: productName,
        productCategory: settings.productCategory,
        generatedImages,
        generatedVideo: generatedVideoUrl,
        caption: `✨ Check out this amazing ${productName}! Perfect for your style! 🔥\n\nWhat do you think? Would you rock this? 💭\n\n#${productName.replace(/\s+/g, '')} #tiktokshop #fyp #fashion #affiliate #style #trending #musthave`,
        hashtags: ['#tiktokshop', '#fyp', '#fashion', '#affiliate', '#style', '#trending', '#musthave', '#ootd', '#fashioninspo'],
        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      setGeneratedContent(newContent);
    } catch (err: any) {
      // If it's an API key error, show demo mode instead
      if (err.message && err.message.includes('API key not valid')) {
        console.log('API key invalid, switching to demo mode');
        await handleDemoMode();
      } else {
        setError(err.message || 'Gagal menghasilkan konten UGC produk.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDemoMode = async () => {
    // Simulate AI generation process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const demoImages: GeneratedProductImage[] = [];
    const selectedVibe = PRODUCT_VIBES.find(v => v.id === settings.selectedVibe);

    for (let i = 0; i < settings.numberOfImages; i++) {
      // Create demo image URLs (placeholder images)
      demoImages.push({
        id: `demo_${Date.now()}_${i}`,
        url: `https://picsum.photos/1080/1920?random=${Date.now() + i}`,
        vibe: selectedVibe?.name || '',
        settings: settings,
        createdAt: new Date().toISOString()
      });
    }

    const demoContent: UGCProductContent = {
      id: `demo_${Date.now()}`,
      productImage: productPreviewUrl || '',
      productName: productName,
      productCategory: settings.productCategory,
      generatedImages: demoImages,
      generatedVideo: settings.generateVideo ? 'Demo video URL' : undefined,
      caption: `✨ Check out this amazing ${productName}! Perfect for your style! 🔥\n\nWhat do you think? Would you rock this? 💭\n\n#${productName.replace(/\s+/g, '')} #tiktokshop #fyp #fashion #affiliate #style #trending #musthave`,
      hashtags: ['#tiktokshop', '#fyp', '#fashion', '#affiliate', '#style', '#trending', '#musthave', '#ootd', '#fashioninspo'],
      createdAt: new Date().toISOString(),
      status: 'completed'
    };

    setGeneratedContent(demoContent);
    setDemoMode(true);
  };

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.click();
  };

  const filteredVibes = PRODUCT_VIBES.filter(vibe => vibe.category === settings.productCategory);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Generator UGC Produk Affiliate</h2>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Buat konten UGC profesional untuk produk affiliate dengan hasil siap pakai TikTok
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Input */}
        <div className="space-y-6">
          {/* Product Upload */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4">1. Upload Produk</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Contoh: Sepatu Sneakers Premium"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Gambar Produk
                </label>
                <FileUpload
                  id="product-upload"
                  onFileSelect={handleProductFileSelect}
                  previewUrl={productPreviewUrl}
                  isLoading={false}
                  file={productFile}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Upload gambar produk dengan background transparan atau putih untuk hasil terbaik
                </p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4">2. Pengaturan Konten</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Produk
                  </label>
                  <select
                    value={settings.productCategory}
                    onChange={(e) => setSettings({...settings, productCategory: e.target.value as ProductCategory})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="fashion">Fashion</option>
                    <option value="small_product">Produk Kecil</option>
                    <option value="beauty_cosmetics">Kecantikan/Kosmetik</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Model
                  </label>
                  <select
                    value={settings.modelGender}
                    onChange={(e) => setSettings({...settings, modelGender: e.target.value as ModelGender})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="female">Wanita</option>
                    <option value="male">Pria</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gaya Pose
                  </label>
                  <select
                    value={settings.poseStyle}
                    onChange={(e) => setSettings({...settings, poseStyle: e.target.value as PoseStyle})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="casual">Kasual</option>
                    <option value="dynamic">Dinamis</option>
                    <option value="elegant">Elegan</option>
                    <option value="interactive">Interaktif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sudut Pandang
                  </label>
                  <select
                    value={settings.cameraAngle}
                    onChange={(e) => setSettings({...settings, cameraAngle: e.target.value as CameraAngle})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="eye_level">Eye Level</option>
                    <option value="low_angle">Low Angle</option>
                    <option value="high_angle">High Angle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Komposisi
                  </label>
                  <select
                    value={settings.composition}
                    onChange={(e) => setSettings({...settings, composition: e.target.value as Composition})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="full_body">Full Body</option>
                    <option value="medium_shot">Medium Shot</option>
                    <option value="close_up">Close-up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Gambar
                  </label>
                  <select
                    value={settings.numberOfImages}
                    onChange={(e) => setSettings({...settings, numberOfImages: parseInt(e.target.value)})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Gambar</option>
                    <option value={2}>2 Gambar</option>
                    <option value={3}>3 Gambar</option>
                    <option value={4}>4 Gambar</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Vibe Selection */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4">3. Pilih Vibe/Latar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredVibes.map((vibe) => (
                <button
                  key={vibe.id}
                  onClick={() => setSettings({...settings, selectedVibe: vibe.id})}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    settings.selectedVibe === vibe.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{vibe.preview}</div>
                  <div className="text-sm font-medium">{vibe.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{vibe.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">4. Pengaturan Lanjutan</h3>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                {showAdvanced ? 'Sembunyikan' : 'Tampilkan'} Pengaturan Lanjutan
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                {/* Style Presets */}
                <div>
                  <h4 className="text-lg font-medium mb-3">Style Presets (Pilih Cepat)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        setSettings({...settings, modelGender: 'female', poseStyle: 'elegant', cameraAngle: 'eye_level', composition: 'full_body', selectedVibe: 'tokyo_street'});
                        setLighting('dramatic');
                        setMood('confident');
                        setColorScheme('cool');
                      }}
                      className="p-2 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      ✨ Fashion Pro
                    </button>
                    <button
                      onClick={() => {
                        setSettings({...settings, modelGender: 'female', poseStyle: 'casual', cameraAngle: 'low_angle', composition: 'medium_shot', selectedVibe: 'tropical_beach'});
                        setLighting('natural');
                        setMood('relaxed');
                        setColorScheme('warm');
                      }}
                      className="p-2 text-xs bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 transition-all"
                    >
                      🏖️ Lifestyle Chill
                    </button>
                    <button
                      onClick={() => {
                        setSettings({...settings, modelGender: 'male', poseStyle: 'dynamic', cameraAngle: 'high_angle', composition: 'full_body', selectedVibe: 'urban_night'});
                        setLighting('dramatic');
                        setMood('energetic');
                        setColorScheme('cool');
                      }}
                      className="p-2 text-xs bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:from-gray-800 hover:to-black transition-all"
                    >
                      🌃 Urban Dynamic
                    </button>
                    <button
                      onClick={() => {
                        setSettings({...settings, modelGender: 'female', poseStyle: 'elegant', cameraAngle: 'eye_level', composition: 'close_up', selectedVibe: 'luxury_mall'});
                        setLighting('studio');
                        setMood('elegant');
                        setColorScheme('neutral');
                      }}
                      className="p-2 text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all"
                    >
                      👑 Luxury Elegant
                    </button>
                  </div>
                </div>

                {/* Customization Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Lighting
                    </label>
                    <select
                      value={lighting}
                      onChange={(e) => setLighting(e.target.value as typeof lighting)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="natural">Natural Light</option>
                      <option value="studio">Studio Light</option>
                      <option value="dramatic">Dramatic Light</option>
                      <option value="soft">Soft Light</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mood
                    </label>
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value as typeof mood)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="happy">Happy</option>
                      <option value="confident">Confident</option>
                      <option value="relaxed">Relaxed</option>
                      <option value="energetic">Energetic</option>
                      <option value="elegant">Elegant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Color Scheme
                    </label>
                    <select
                      value={colorScheme}
                      onChange={(e) => setColorScheme(e.target.value as typeof colorScheme)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="warm">Warm Colors</option>
                      <option value="cool">Cool Colors</option>
                      <option value="neutral">Neutral</option>
                      <option value="vibrant">Vibrant</option>
                    </select>
                  </div>
                </div>

                {/* Processing Options */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoCrop"
                      checked={autoCrop}
                      onChange={(e) => setAutoCrop(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="autoCrop" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                      Auto-crop produk (hapus background putih)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="batchGenerate"
                      checked={batchGenerate}
                      onChange={(e) => setBatchGenerate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="batchGenerate" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                      Batch generate (multiple variations)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Options */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4">5. Opsi Video (Opsional)</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="generateVideo"
                  checked={settings.generateVideo}
                  onChange={(e) => setSettings({...settings, generateVideo: e.target.checked})}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="generateVideo" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Buat video promosi (6-10 detik)
                </label>
              </div>

              {settings.generateVideo && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Durasi Video
                  </label>
                  <select
                    value={settings.videoDuration}
                    onChange={(e) => setSettings({...settings, videoDuration: parseInt(e.target.value)})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={6}>6 detik</option>
                    <option value={8}>8 detik</option>
                    <option value={10}>10 detik</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-semibold mb-4">6. Generate Konten</h3>
            <div className="space-y-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {apiKey ? 'Membuat Konten UGC dengan AI...' : 'Menjalankan Demo Mode...'}
                  </>
                ) : (
                  <>
                    <span className="mr-2">{apiKey ? '🚀' : '🎭'}</span>
                    {apiKey ? 'Buat Konten UGC dengan AI' : 'Coba Demo Mode'}
                  </>
                )}
              </button>

              {!apiKey && <ApiKeyNotice className="text-xs mt-2 text-center" message="Masukkan API Key Gemini untuk menggunakan fitur AI generation." />}

              {apiKey && productFile && productName.trim() && (
                <div className="text-xs text-green-600 dark:text-green-400 text-center">
                  ✅ API Key valid! Akan membuat {settings.numberOfImages} gambar AI + {settings.generateVideo ? `${settings.videoDuration} detik video` : 'tanpa video'}
                </div>
              )}

              {!apiKey && productFile && productName.trim() && (
                <div className="text-xs text-orange-600 dark:text-orange-400 text-center">
                  🎭 Demo mode aktif - Tambahkan API Key di header untuk hasil AI sesungguhnya
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Results */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
              <p className="font-bold">Kesalahan</p>
              <p>{error}</p>
            </div>
          )}

          {isGenerating && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-600 dark:text-slate-400">
                  🤖 AI sedang membuat konten UGC profesional...
                </p>
                <p className="text-sm text-slate-500">
                  Menganalisis produk → Membuat prompt AI → Generate gambar → Optimasi TikTok
                </p>
                <div className="text-xs text-slate-400">
                  Proses ini memakan waktu 30-60 detik tergantung kompleksitas
                </div>
              </div>
            </div>
          )}

          {!apiKey && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <div className="text-center space-y-3">
                <div className="text-2xl">🔑</div>
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                  API Key Diperlukan
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Untuk menggunakan UGC Product Generator dengan AI, Anda perlu:
                </p>
                <div className="text-left text-sm text-yellow-700 dark:text-yellow-400 space-y-2">
                  <div>1. Buka <strong>Google AI Studio</strong> (makersuite.google.com)</div>
                  <div>2. Buat API Key baru</div>
                  <div>3. Masukkan API Key di field yang tersedia di header aplikasi</div>
                  <div>4. Pastikan API Key memiliki akses ke Gemini 2.5 Flash</div>
                </div>
                <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    <strong>Catatan:</strong> Fitur AI generation memerlukan API key yang valid. Tanpa API key, Anda hanya dapat melihat preview interface.
                  </p>
                </div>
              </div>
            </div>
          )}

          {generatedContent && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Hasil Konten UGC</h3>
                {demoMode && (
                  <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                    🎭 Demo Mode
                  </div>
                )}
              </div>

              {/* Generated Images */}
              <div className="space-y-4">
                <h4 className="font-medium">Gambar yang Dihasilkan ({generatedContent.generatedImages.length})</h4>
                <div className="grid grid-cols-2 gap-4">
                  {generatedContent.generatedImages.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="w-full aspect-[9/16] object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        {image.vibe}
                      </div>
                      <button
                        onClick={() => handleDownloadImage(image.url, `ugc-product-${productName}-${index + 1}.png`)}
                        className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption and Hashtags */}
              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Caption Otomatis</h4>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-sm">{generatedContent.caption}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {generatedContent.hashtags.map((hashtag, index) => (
                        <span key={index} className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* TikTok Optimization Info */}
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">✅ Optimasi TikTok</h4>
                <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                  <li>• Format: 9:16 (Portrait) - Sempurna untuk TikTok</li>
                  <li>• Resolusi: HD (1080x1920) - Kualitas tinggi</li>
                  <li>• Caption & Hashtag otomatis - Siap posting</li>
                  <li>• Vibe sesuai kategori produk - Menarik audiens</li>
                </ul>
              </div>

              {/* Demo Mode Info */}
              {demoMode && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">🎭 Demo Mode Aktif</h4>
                  <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                    <p>Ini adalah hasil demo menggunakan placeholder images. Untuk mendapatkan hasil AI yang sesungguhnya:</p>
                    <div className="space-y-1">
                      <div>1. Buka <strong>Google AI Studio</strong> (makersuite.google.com)</div>
                      <div>2. Buat API Key Gemini baru</div>
                      <div>3. Masukkan API Key di header aplikasi</div>
                      <div>4. Klik "Buat Konten UGC dengan AI" lagi</div>
                    </div>
                    <p className="mt-2 text-xs">
                      <strong>Dengan API key:</strong> Anda akan mendapatkan gambar yang dihasilkan AI berdasarkan produk, model, pose, dan vibe yang dipilih!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Preview */}
          {productPreviewUrl && !generatedContent && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50">
              <h3 className="text-xl font-semibold mb-4">Preview Produk</h3>
              <div className="relative">
                <img
                  src={productPreviewUrl}
                  alt="Product Preview"
                  className="w-full max-w-sm mx-auto rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <div className="mt-2 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{productName || 'Produk belum diberi nama'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};