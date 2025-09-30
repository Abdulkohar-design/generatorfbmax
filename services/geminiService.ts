import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedMetadata, ReactionStyle, OutputLength, VeoPrompts, ToneAnalysisResult, RepurposingIdea, ImageToVideoResult, QuoteCategory, TextCategory, GeneratedText, TextImageCategory, ProductCategory, ModelGender, PoseStyle, CameraAngle, Composition, UGCProductSettings, GeneratedProductImage, UGCProductContent, SpiritualTheme, SpiritualContent, SpiritualSettings } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const metadataSchema = {
  type: Type.OBJECT,
  properties: {
    titles: {
      type: Type.ARRAY,
      description: "3 judul yang menarik dan memikat, dioptimalkan untuk CTR.",
      items: { type: Type.STRING }
    },
    descriptions: {
      type: Type.ARRAY,
      description: "3 deskripsi yang menarik, ramah SEO, yang menceritakan sebuah kisah atau mengajukan pertanyaan.",
      items: { type: Type.STRING }
    },
    hashtags: {
      type: Type.ARRAY,
      description: "Daftar 10-15 hashtag yang relevan, termasuk tag populer dan khusus.",
      items: { type: Type.STRING }
    },
    cta: {
      type: Type.STRING,
      description: "Ajakan bertindak yang jelas dan meyakinkan."
    },
    location: {
      type: Type.STRING,
      description: "Lokasi spesifik yang ditampilkan dalam media, atau string kosong jika tidak dapat dibedakan."
    },
  },
  required: ["titles", "descriptions", "hashtags", "cta", "location"]
};

export const generateFacebookMetadata = async (file: File, apiKey: string): Promise<GeneratedMetadata> => {
  if (!apiKey) {
    throw new Error("API Key Gemini diperlukan.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const mediaPart = await fileToGenerativePart(file);

    const prompt = `Anda adalah seorang manajer media sosial ahli yang membuat konten Facebook yang menarik. Analisis media (gambar atau video) ini dan hasilkan metadata yang dioptimalkan untuk keterlibatan maksimal.
    - Judul: menarik dan memikat.
    - Deskripsi: menarik, ramah SEO, dan menceritakan sebuah kisah.
    - Hashtag: campuran tag populer dan khusus.
    - CTA: ajakan bertindak yang jelas.
    - Lokasi: identifikasi jika memungkinkan, jika tidak biarkan kosong.
    
    Berikan respons Anda dalam format JSON terstruktur yang ditentukan oleh skema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          mediaPart,
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: metadataSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);
    
    const normalizedHashtags = (parsedJson.hashtags || [])
      .map((tag: string) => tag.trim().startsWith('#') ? tag.trim().substring(1) : tag.trim())
      .filter((tag: string) => tag.length > 0);

    return {
      titles: parsedJson.titles || [],
      descriptions: parsedJson.descriptions || [],
      hashtags: normalizedHashtags,
      cta: parsedJson.cta || '',
      location: parsedJson.location || '',
    };

  } catch (error) {
    console.error("Error generating metadata:", error);
    throw new Error("Gagal menghasilkan metadata dari AI. Silakan periksa konsol untuk detailnya.");
  }
};

export const generateReactionCaption = async (
    file: File, 
    style: ReactionStyle, 
    length: OutputLength, 
    includeHashtags: boolean,
    apiKey: string
): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const mediaPart = await fileToGenerativePart(file);

        const lengthMap = {
            'Pendek': 'sekitar 1-2 kalimat singkat.',
            'Sedang': 'sekitar 3-4 kalimat.',
            'Panjang': 'satu paragraf penuh yang mendetail.'
        };

        const prompt = `Anda adalah seorang content creator viral di media sosial. Tugas Anda adalah membuat 3 variasi caption reaksi untuk media (gambar/video) yang diberikan.
        - Analisis media ini.
        - Buat caption dengan gaya: ${style}. Jika 'Otomatis', pilih gaya yang paling sesuai dengan konten media.
        - Panjang caption harus: ${lengthMap[length]}.
        - ${includeHashtags ? 'Sertakan juga 3-5 hashtag yang relevan dan viral di akhir setiap caption.' : 'Jangan sertakan hashtag.'}
        
        Fokus pada pembuatan teks yang otentik, menarik, dan sesuai dengan gaya yang diminta. Hasilnya harus berupa array JSON dari string.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, mediaPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        captions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["captions"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson.captions || [];

    } catch (error) {
        console.error("Error generating reaction caption:", error);
        throw new Error("Gagal menghasilkan caption reaksi. Silakan periksa konsol.");
    }
};

export const generateImagePrompt = async (file: File, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const mediaPart = await fileToGenerativePart(file);
        const prompt = `Analisis media ini (gambar atau video) secara mendalam. Jika ini adalah video, fokuslah pada frame yang paling representatif atau adegan pembuka. Uraikan subjek utama, latar belakang, gaya artistik, pencahayaan, palet warna, dan komposisi. Berdasarkan analisis Anda, buatlah sebuah prompt gambar yang sangat deskriptif dan presisi (dalam Bahasa Inggris) yang dapat digunakan pada AI image generator seperti Midjourney atau DALL-E untuk menciptakan gambar dengan esensi dan gaya yang serupa. Fokus pada detail visual dan atmosfer.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, mediaPart] },
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error generating image prompt:", error);
        throw new Error("Gagal menghasilkan prompt gambar. Silakan periksa konsol.");
    }
};

const imageToVideoSchema = {
    type: Type.OBJECT,
    properties: {
        scene_description: {
            type: Type.STRING,
            description: "Deskripsi prompt sinematik (dalam Bahasa Inggris) untuk menganimasikan gambar, termasuk pergerakan kamera, elemen atmosfer, dan tindakan halus. Ini adalah prompt visual untuk VEO."
        },
        dialogue: {
            type: Type.STRING,
            description: "Satu atau dua baris dialog singkat dan relevan (dalam bahasa yang paling sesuai untuk adegan tersebut) yang diucapkan oleh subjek atau sebagai sulih suara. Jika tidak ada dialog yang masuk akal, kembalikan string kosong."
        }
    },
    required: ["scene_description", "dialogue"]
};

export const generateImageToVideoPrompt = async (file: File, apiKey: string): Promise<ImageToVideoResult> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const mediaPart = await fileToGenerativePart(file);
        const prompt = `Anda adalah seorang sutradara kreatif yang membuat prompt untuk model AI gambar-ke-video canggih seperti VEO 3. Analisis gambar statis ini.
        
        Tugas Anda adalah membuat JSON terstruktur yang berisi:
        1.  'scene_description': Sebuah prompt (dalam Bahasa Inggris) yang mendeskripsikan bagaimana cara menganimasikan gambar ini menjadi klip video 3-5 detik yang sinematik. Sarankan pergerakan kamera (misalnya, slow zoom in), perubahan atmosfer (misalnya, "mist slowly rolls in"), dan tindakan halus dari subjek.
        2.  'dialogue': Buat satu atau dua baris dialog pendek yang relevan yang bisa diucapkan oleh subjek dalam gambar, atau sebagai sulih suara yang sesuai dengan suasana hati. Dialog ini harus menghidupkan adegan.

        Tujuannya adalah untuk menciptakan prompt adegan yang lengkap untuk VEO 3 yang menghasilkan klip video yang kaya cerita dan menarik secara visual.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, mediaPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: imageToVideoSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson;

    } catch (error) {
        console.error("Error generating image-to-video prompt:", error);
        throw new Error("Gagal menghasilkan prompt gambar-ke-video. Silakan periksa konsol.");
    }
};

const veoPromptSchema = {
    type: Type.ARRAY,
    description: "Daftar prompt adegan video, dipecah menjadi segmen 8 detik.",
    items: {
        type: Type.OBJECT,
        properties: {
            scene_description: {
                type: Type.STRING,
                description: "Deskripsi visual yang mendetail dari adegan dalam segmen 8 detik ini, dalam Bahasa Inggris."
            },
            dialogue: {
                type: Type.STRING,
                description: "Transkripsi akurat dari setiap dialog yang diucapkan dalam segmen 8 detik ini, dalam bahasa aslinya. Jika tidak ada dialog, kembalikan string kosong."
            }
        },
        required: ["scene_description", "dialogue"]
    }
};

export const generateVeoVideoPrompts = async (file: File, apiKey: string): Promise<VeoPrompts> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const mediaPart = await fileToGenerativePart(file);
        const prompt = `Anda adalah seorang sutradara AI yang ahli dalam membuat prompt untuk model video generatif canggih seperti VEO. Tugas Anda adalah menganalisis file video ini dan mengubahnya menjadi serangkaian prompt JSON terstruktur.
        
        Instruksi:
        1.  Tonton dan pahami seluruh video.
        2.  Bagi video menjadi segmen-segmen berurutan, di mana setiap segmen mewakili durasi sekitar 8 detik.
        3.  Untuk setiap segmen 8 detik, buat objek JSON yang berisi dua kunci: 'scene_description' dan 'dialogue'.
        4.  'scene_description': Tulis deskripsi visual yang kaya dan mendetail tentang apa yang terjadi di segmen tersebut (dalam Bahasa Inggris). Jelaskan aksi, karakter, latar, pencahayaan, dan gaya sinematik.
        5.  'dialogue': Transkripsikan secara akurat semua kata yang diucapkan dalam segmen tersebut. Jika tidak ada dialog, berikan string kosong ("").
        6.  Hasil akhir Anda harus berupa array JSON dari objek-objek ini, yang secara akurat mewakili alur video.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, mediaPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: veoPromptSchema,
            }
        });
        
        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson || [];

    } catch (error) {
        console.error("Error generating VEO video prompts:", error);
        throw new Error("Gagal menghasilkan prompt video VEO. Silakan periksa konsol.");
    }
};

const toneAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        tone: {
            type: Type.STRING,
            description: "Sebuah ringkasan singkat (3-5 kata kunci) dari nada dan suasana emosional media. Contoh: 'Inspiratif, Tenang, Alami'."
        },
        audience: {
            type: Type.STRING,
            description: "Deskripsi ringkas tentang target audiens yang ideal untuk konten ini. Contoh: 'Profesional muda (25-35) yang tertarik pada keberlanjutan dan perjalanan'."
        },
        talkingPoints: {
            type: Type.ARRAY,
            description: "Daftar 2-3 poin pembicaraan atau sudut pandang utama yang harus ditekankan dalam caption untuk menarik audiens target.",
            items: { type: Type.STRING }
        }
    },
    required: ["tone", "audience", "talkingPoints"]
};

export const analyzeToneAndAudience = async (file: File, apiKey: string): Promise<ToneAnalysisResult> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const mediaPart = await fileToGenerativePart(file);
        const prompt = `Anda adalah seorang ahli strategi media sosial. Lakukan analisis mendalam terhadap media (gambar/video) ini untuk memberikan wawasan strategis. Berdasarkan konten visual dan konteksnya, tentukan hal-hal berikut:
        1.  **Nada (Tone):** Identifikasi suasana emosional utama. Berikan 3-5 kata kunci deskriptif.
        2.  **Audiens (Audience):** Jelaskan demografi dan minat target audiens yang paling relevan untuk konten ini.
        3.  **Poin Pembicaraan (Talking Points):** Sarankan 2-3 sudut pandang atau topik utama yang harus diangkat dalam caption untuk beresonansi dengan audiens tersebut.

        Format respons Anda sebagai objek JSON sesuai dengan skema yang disediakan.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, mediaPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: toneAnalysisSchema,
            }
        });
        
        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson;

    } catch (error) {
        console.error("Error analyzing tone and audience:", error);
        throw new Error("Gagal menganalisis nada dan audiens. Silakan periksa konsol.");
    }
};

const repurposingIdeasSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      description: "Daftar 3-4 ide konkret untuk menggunakan kembali konten di platform lain.",
      items: {
        type: Type.OBJECT,
        properties: {
          platform: {
            type: Type.STRING,
            enum: ['Instagram', 'TikTok', 'X', 'LinkedIn'],
            description: "Platform media sosial target."
          },
          idea: {
            type: Type.STRING,
            description: "Saran yang dapat ditindaklanuti dan spesifik untuk platform tersebut."
          }
        },
        required: ["platform", "idea"]
      }
    }
  },
  required: ["ideas"]
};

export const generateRepurposingIdeas = async (file: File, context: string, apiKey: string): Promise<RepurposingIdea[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const mediaPart = await fileToGenerativePart(file);
        const prompt = `Anda adalah seorang ahli strategi konten media sosial. Analisis media yang diberikan dan deskripsi konteks berikut: "${context}".
        
        Berdasarkan ini, hasilkan 3-4 ide konkret dan kreatif untuk menggunakan kembali konten ini di platform media sosial lainnya. Untuk setiap ide, tentukan platform (pilih dari Instagram, TikTok, X, LinkedIn) dan berikan saran yang dapat ditindaklanuti dan spesifik untuk platform tersebut.

        Contoh:
        - Instagram: "Ubah video ini menjadi Reel 15 detik, gunakan audio yang sedang tren [nama audio], dan tambahkan overlay teks yang menyoroti momen kunci."
        - X: "Buat thread 3-tweet. Tweet pertama dengan gambar ini dan pertanyaan yang menarik. Tweet kedua berikan konteks. Tweet ketiga ajukan CTA."

        Pastikan ide-ide Anda memaksimalkan format dan budaya unik setiap platform. Format respons Anda sebagai objek JSON sesuai dengan skema yang disediakan.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, mediaPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: repurposingIdeasSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson.ideas || [];

    } catch (error) {
        console.error("Error generating repurposing ideas:", error);
        throw new Error("Gagal menghasilkan ide konten lintas platform. Silakan periksa konsol.");
    }
};


export const generateQuotes = async (category: QuoteCategory, apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Anda adalah seorang penulis dan filsuf yang mendalam. Buat 4 kutipan unik, singkat, dan kuat dalam Bahasa Indonesia dengan tema "${category}". Kutipan harus terasa orisinal, menggugah pikiran, dan cocok untuk media sosial. Format hasilnya sebagai array JSON dari string.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quotes: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["quotes"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson.quotes || [];

    } catch (error) {
        console.error("Error generating quotes:", error);
        throw new Error("Gagal menghasilkan kutipan. Silakan periksa konsol.");
    }
};

export const generateImageWithImagen = async (prompt: string, aspectRatio: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: aspectRatio,
                },
            });

            if (!response.generatedImages || response.generatedImages.length === 0) {
                throw new Error("AI tidak mengembalikan gambar.");
            }

            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;

        } catch (error: any) {
            console.error("Error generating image with Imagen:", error);

            // Check if it's a quota exceeded error (429)
            if (error?.error?.code === 429) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error("Kuota API Gemini telah habis. Silakan coba lagi nanti atau upgrade ke paket berbayar.");
                }

                // Exponential backoff: wait 1s, 2s, 4s, 8s, 16s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`Quota exceeded, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // For other errors, throw immediately
            throw new Error("Gagal menghasilkan gambar. Silakan periksa konsol.");
        }
    }

    throw new Error("Gagal menghasilkan gambar setelah beberapa percobaan. Silakan periksa konsol.");
};

export const editImageWithGemini = async (files: File[], prompt: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const imageParts = await Promise.all(files.map(file => fileToGenerativePart(file)));

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image-preview',
              contents: {
                parts: [...imageParts, { text: prompt }],
              },
              config: {
                  responseModalities: [Modality.IMAGE, Modality.TEXT],
              },
            });

            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
              }
            }

            throw new Error("AI tidak mengembalikan gambar yang diedit.");

        } catch (error: any) {
            console.error("Error editing image with Gemini:", error);

            // Check if it's a quota exceeded error (429)
            if (error?.error?.code === 429) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error("Kuota API Gemini telah habis. Silakan coba lagi nanti atau upgrade ke paket berbayar.");
                }

                // Exponential backoff: wait 1s, 2s, 4s, 8s, 16s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`Quota exceeded, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // For other errors, throw immediately
            throw new Error("Gagal mengedit gambar. Silakan periksa konsol.");
        }
    }

    throw new Error("Gagal mengedit gambar setelah beberapa percobaan. Silakan periksa konsol.");
};

export const generateImagePromptSuggestions = async (apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Buat 3 saran prompt yang sangat kreatif dan beragam (dalam Bahasa Inggris) untuk generator gambar AI seperti Imagen atau Midjourney. Prompt harus imajinatif dan mendetail. Format hasilnya sebagai array JSON dari string.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["suggestions"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson.suggestions || [];

    } catch (error) {
        console.error("Error generating prompt suggestions:", error);
        throw new Error("Gagal menghasilkan saran prompt. Silakan periksa konsol.");
    }
};

export const generateEnglishText = async (category: TextCategory, apiKey: string): Promise<GeneratedText[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const prompt = `Buat 4 teks unik dan menarik dalam Bahasa Inggris dengan terjemahan Indonesia dengan tema "${category}". Setiap teks harus:
- Relevan dengan kategori yang dipilih
- Menarik dan engaging untuk media sosial
- Teks Inggris: maksimal 80 karakter
- Terjemahan Indonesia: maksimal 85 karakter
- Total kombinasi: maksimal 165 karakter
- Original dan tidak klise
- Sesuai untuk postingan inspiratif atau informatif

Format hasilnya sebagai array JSON dari objek dengan struktur:
{
  "english": "teks dalam bahasa Inggris",
  "indonesian": "terjemahan dalam bahasa Indonesia"
}

Pastikan setiap teks tidak lebih dari batas karakter yang ditentukan.`;

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
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        english: { type: Type.STRING },
                                        indonesian: { type: Type.STRING }
                                    },
                                    required: ["english", "indonesian"]
                                }
                            }
                        },
                        required: ["texts"]
                    }
                }
            });

            const jsonString = response.text.trim();
            const parsedJson = JSON.parse(jsonString);
            return parsedJson.texts || [];

        } catch (error: any) {
            console.error("Error generating bilingual text:", error);

            // Check if it's a quota exceeded error (429)
            if (error?.error?.code === 429) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error("Kuota API Gemini telah habis. Silakan coba lagi nanti atau upgrade ke paket berbayar.");
                }

                // Exponential backoff: wait 1s, 2s, 4s, 8s, 16s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`Quota exceeded, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // For other errors, throw immediately
            throw new Error("Gagal menghasilkan teks bilingual. Silakan periksa konsol.");
        }
    }

    throw new Error("Gagal menghasilkan teks bilingual setelah beberapa percobaan. Silakan periksa konsol.");
};

export const translateText = async (englishText: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const prompt = `Terjemahkan teks berikut ke dalam Bahasa Indonesia. Buat terjemahan yang ringkas dan natural, maksimal 85 karakter termasuk spasi. Pertahankan makna asli tapi buat lebih ringkas jika perlu:

"${englishText}"

Berikan hanya terjemahan saja tanpa penjelasan tambahan.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] }
            });

            return response.text.trim();

        } catch (error: any) {
            console.error("Error translating text:", error);

            // Check if it's a quota exceeded error (429)
            if (error?.error?.code === 429) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error("Kuota API Gemini telah habis. Silakan coba lagi nanti atau upgrade ke paket berbayar.");
                }

                // Exponential backoff: wait 1s, 2s, 4s, 8s, 16s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`Quota exceeded, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // For other errors, throw immediately
            throw new Error("Gagal menerjemahkan teks. Silakan periksa konsol.");
        }
    }

    throw new Error("Gagal menerjemahkan teks setelah beberapa percobaan. Silakan periksa konsol.");
};

export const generateTextForImage = async (category: TextImageCategory, apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Buat 4 konten unik dan menarik dalam Bahasa Indonesia dengan tema "${category}". Setiap konten harus mengikuti format seperti contoh berikut:

📌 Contoh Format:
PESAN ALAM YANG JANGAN PERNAH KAMU LANGGAR

Jangan marah pada orang yang sedang makan.
Jika di gunung ketemu pasar, jangan beli apapun di sana.
Kalau orang tuamu melarang pergi, jangan pergi.
Jangan membuat candaan bila kamu melihat kekurangan seseorang.
Jika bertamu, kemudian disuguhkan makanan, maka makanlah walaupun sedikit.

ATAU format dengan angka:
5 HAL YANG MEMBUKA PINTU REZEKI

Bersyukur dalam keadaan apapun.
Tidak berhenti berusaha meski hasil belum terlihat.
Menjaga silaturahmi dengan ikhlas.
Tidak memutus doa kepada kedua orang tua.
Rajin bersedekah meski hanya sedikit.

Setiap konten harus:
- Judul dalam HURUF BESAR dengan emoji 📌
- Konten yang informatif dan bermanfaat
- Menggunakan format daftar (dengan atau tanpa angka)
- Total panjang 200-400 karakter
- Bahasa Indonesia yang natural dan mudah dipahami
- Tema yang relevan dengan kategori "${category}"

Format hasilnya sebagai array JSON dari string yang sudah diformat lengkap.`;

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
        return parsedJson.texts || [];

    } catch (error) {
        console.error("Error generating text for image:", error);
        throw new Error("Gagal menghasilkan teks untuk gambar. Silakan periksa konsol.");
    }
};

// UGC-related functions
const ugcOptimizationSchema = {
    type: Type.OBJECT,
    properties: {
        optimizedTitle: {
            type: Type.STRING,
            description: "Judul yang dioptimalkan untuk engagement"
        },
        optimizedContent: {
            type: Type.STRING,
            description: "Konten yang dioptimalkan dengan gaya UGC yang autentik"
        },
        suggestedHashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5-8 hashtag yang relevan dan trending"
        },
        engagementTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Tips untuk meningkatkan engagement"
        },
        callToAction: {
            type: Type.STRING,
            description: "Call-to-action yang natural dan mengundang interaksi"
        }
    },
    required: ["optimizedTitle", "optimizedContent", "suggestedHashtags", "engagementTips", "callToAction"]
};

export const optimizeUGCContent = async (
    originalContent: string,
    contentType: 'text' | 'image' | 'video',
    targetAudience: string,
    apiKey: string
): Promise<{
    optimizedTitle: string;
    optimizedContent: string;
    suggestedHashtags: string[];
    engagementTips: string[];
    callToAction: string;
}> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Anda adalah seorang UGC specialist yang ahli dalam mengoptimalkan konten user-generated untuk media sosial.

Konten asli: "${originalContent}"
Tipe konten: ${contentType}
Target audiens: ${targetAudience}

Tugas Anda:
1. Buat judul yang lebih menarik dan engaging
2. Optimalkan konten dengan gaya UGC yang autentik dan natural
3. Sarankan hashtag yang relevan dan trending
4. Berikan tips untuk meningkatkan engagement
5. Buat call-to-action yang natural dan mengundang interaksi

Pastikan hasil tetap mempertahankan suara asli pembuat konten tapi lebih engaging dan sesuai dengan best practices UGC.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: ugcOptimizationSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return {
            optimizedTitle: parsedJson.optimizedTitle || 'Konten Dioptimalkan',
            optimizedContent: parsedJson.optimizedContent || originalContent,
            suggestedHashtags: parsedJson.suggestedHashtags || [],
            engagementTips: parsedJson.engagementTips || [],
            callToAction: parsedJson.callToAction || 'Apa pendapatmu tentang ini?'
        };

    } catch (error) {
        console.error("Error optimizing UGC content:", error);
        throw new Error("Gagal mengoptimalkan konten UGC. Silakan periksa konsol.");
    }
};

export const suggestUGCTags = async (
    content: string,
    contentType: 'text' | 'image' | 'video',
    apiKey: string
): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Sebagai UGC strategist, sarankan 5-8 hashtag yang relevan dan trending untuk konten berikut:

Konten: "${content}"
Tipe: ${contentType}

Saran hashtag harus:
- Relevan dengan konten
- Mix antara popular dan niche hashtags
- Menggunakan format #Hashtag tanpa spasi
- Focus pada engagement dan discoverability

Format hasil sebagai array JSON dari string hashtag.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        hashtags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["hashtags"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return parsedJson.hashtags || [];

    } catch (error) {
        console.error("Error suggesting UGC tags:", error);
        throw new Error("Gagal menghasilkan saran hashtag. Silakan periksa konsol.");
    }
};

export const generateUGCContent = async (
    topic: string,
    contentType: 'text' | 'image' | 'video',
    style: 'casual' | 'professional' | 'humorous' | 'inspirational',
    apiKey: string
): Promise<{
    title: string;
    content: string;
    suggestedHashtags: string[];
    engagementTips: string[];
}> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const stylePrompts = {
            casual: "gaya santai dan friendly seperti teman sedang bercerita",
            professional: "gaya profesional tapi tetap approachable",
            humorous: "gaya lucu dan menghibur",
            inspirational: "gaya inspiratif dan memotivasi"
        };

        const prompt = `Buat konten UGC ${contentType} dengan topik "${topic}" dalam gaya ${stylePrompts[style]}.

Tugas Anda:
1. Buat judul yang menarik dan natural
2. Buat konten yang terasa autentik seperti dibuat oleh user biasa
3. Sarankan hashtag yang relevan
4. Berikan tips untuk engagement

Pastikan konten terasa:
- Personal dan relatable
- Tidak terlalu dipoles atau salesy
- Mengundang interaksi dan komentar
- Sesuai dengan tren UGC saat ini

Format sebagai JSON dengan struktur: { title, content, suggestedHashtags, engagementTips }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        suggestedHashtags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        engagementTips: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["title", "content", "suggestedHashtags", "engagementTips"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return {
            title: parsedJson.title || topic,
            content: parsedJson.content || '',
            suggestedHashtags: parsedJson.suggestedHashtags || [],
            engagementTips: parsedJson.engagementTips || []
        };

    } catch (error) {
        console.error("Error generating UGC content:", error);
        throw new Error("Gagal menghasilkan konten UGC. Silakan periksa konsol.");
    }
};

export const analyzeUGCPerformance = async (
    content: string,
    engagement: { likes: number; shares: number; comments: number; views: number },
    contentType: 'text' | 'image' | 'video',
    apiKey: string
): Promise<{
    performanceScore: number;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    predictedEngagement: { likes: number; shares: number; comments: number };
}> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const totalEngagement = engagement.likes + engagement.shares + engagement.comments;
        const engagementRate = engagement.views > 0 ? (totalEngagement / engagement.views) * 100 : 0;

        const prompt = `Analisis performa konten UGC berikut:

Konten: "${content}"
Tipe: ${contentType}
Engagement saat ini:
- Views: ${engagement.views}
- Likes: ${engagement.likes}
- Shares: ${engagement.shares}
- Comments: ${engagement.comments}
- Engagement Rate: ${engagementRate.toFixed(2)}%

Berikan analisis komprehensif dengan:
1. Performance score (0-100)
2. Strengths (hal-hal yang sudah bagus)
3. Areas for improvement
4. Specific recommendations
5. Predicted engagement untuk konten serupa di masa depan

Format sebagai JSON dengan struktur yang sesuai.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        performanceScore: { type: Type.NUMBER },
                        strengths: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        improvements: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        recommendations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        predictedEngagement: {
                            type: Type.OBJECT,
                            properties: {
                                likes: { type: Type.NUMBER },
                                shares: { type: Type.NUMBER },
                                comments: { type: Type.NUMBER }
                            }
                        }
                    },
                    required: ["performanceScore", "strengths", "improvements", "recommendations", "predictedEngagement"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return {
            performanceScore: Math.min(100, Math.max(0, parsedJson.performanceScore || 50)),
            strengths: parsedJson.strengths || [],
            improvements: parsedJson.improvements || [],
            recommendations: parsedJson.recommendations || [],
            predictedEngagement: parsedJson.predictedEngagement || { likes: 0, shares: 0, comments: 0 }
        };

    } catch (error) {
        console.error("Error analyzing UGC performance:", error);
        throw new Error("Gagal menganalisis performa UGC. Silakan periksa konsol.");
    }
};

// UGC Product Generator Functions

const ugcProductImageSchema = {
    type: Type.OBJECT,
    properties: {
        imagePrompt: {
            type: Type.STRING,
            description: "Prompt detail untuk menghasilkan gambar UGC produk dengan model, pose, dan background yang sesuai"
        },
        caption: {
            type: Type.STRING,
            description: "Caption TikTok yang engaging dan natural untuk produk"
        },
        hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5-8 hashtag relevan untuk TikTok"
        },
        tips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Tips untuk meningkatkan engagement"
        }
    },
    required: ["imagePrompt", "caption", "hashtags", "tips"]
};

export const generateUGCProductPrompt = async (
    productFile: File,
    productName: string,
    settings: UGCProductSettings,
    apiKey: string
): Promise<{
    imagePrompt: string;
    caption: string;
    hashtags: string[];
    tips: string[];
}> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const productPart = await fileToGenerativePart(productFile);

        const vibeDescriptions = {
            // Fashion
            'tokyo_street': 'japanese street fashion, urban tokyo night scene with neon lights, busy city street, modern fashion photography',
            'urban_night': 'urban night photography, city lights, street style, modern fashion, dramatic lighting',
            'scandinavian_interior': 'minimalist scandinavian interior, clean white walls, modern furniture, natural light, fashion lifestyle',
            'minimalist_studio': 'clean white studio background, professional fashion photography, minimal props, bright even lighting',

            // Small Products
            'metal_glass_reflection': 'metallic and glass surfaces with reflections, luxury product photography, dramatic lighting, high-end feel',
            'rustic_wood_table': 'rustic wooden table surface, natural wood grain, warm lighting, cozy atmosphere, lifestyle product shot',
            'dark_textured_bg': 'dark textured background, moody lighting, dramatic shadows, high contrast, luxury product presentation',
            'smooth_gradient': 'smooth gradient background, soft lighting, elegant color transitions, premium product photography',
            'moss_stone_garden': 'natural moss and stone garden setting, organic textures, natural lighting, earthy tones, outdoor lifestyle',

            // Beauty & Cosmetics
            'beauty_minimalist_studio': 'clean beauty studio, soft diffused lighting, minimal makeup setup, professional beauty photography',
            'geometric_shapes': 'modern geometric shapes, clean lines, contemporary beauty setup, artistic lighting',
            'soft_bright_bg': 'soft bright background, natural light, clean beauty aesthetic, fresh and modern',

            // Lifestyle
            'tropical_beach': 'tropical beach setting, golden sand, turquoise water, natural sunlight, relaxed lifestyle atmosphere',
            'rooftop_bar': 'urban rooftop bar, city skyline view, evening golden hour, sophisticated lifestyle setting',
            'flower_garden': 'colorful flower garden, vibrant natural setting, soft natural light, romantic lifestyle atmosphere',
            'aesthetic_cafe': 'aesthetic cafe interior, cozy atmosphere, warm lighting, lifestyle photography setting'
        };

        const modelDescriptions = {
            'male': 'handsome male model, attractive man, stylish guy',
            'female': 'beautiful female model, attractive woman, stylish girl'
        };

        const poseDescriptions = {
            'casual': 'relaxed casual pose, natural stance, friendly expression',
            'dynamic': 'dynamic action pose, movement, energetic expression',
            'elegant': 'elegant sophisticated pose, graceful movement, refined expression',
            'interactive': 'interactive pose, engaging with product, natural interaction'
        };

        const angleDescriptions = {
            'eye_level': 'eye level camera angle, natural perspective',
            'low_angle': 'low angle shot, looking up, empowering perspective',
            'high_angle': 'high angle shot, looking down, lifestyle perspective'
        };

        const compositionDescriptions = {
            'full_body': 'full body shot, head to toe, complete figure',
            'medium_shot': 'medium shot, waist up, balanced composition',
            'close_up': 'close up shot, detailed focus, intimate perspective'
        };

        const selectedVibe = vibeDescriptions[settings.selectedVibe as keyof typeof vibeDescriptions] || '';
        const selectedModel = modelDescriptions[settings.modelGender];
        const selectedPose = poseDescriptions[settings.poseStyle];
        const selectedAngle = angleDescriptions[settings.cameraAngle];
        const selectedComposition = compositionDescriptions[settings.composition];

        const prompt = `Anda adalah seorang UGC content creator dan fashion photographer profesional. Analisis gambar produk ini dan buat konten UGC yang sempurna untuk TikTok Affiliate.

DETAIL PRODUK:
- Nama: ${productName}
- Kategori: ${settings.productCategory}
- Model: ${selectedModel}
- Pose: ${selectedPose}
- Sudut: ${selectedAngle}
- Komposisi: ${selectedComposition}
- Vibe/Latar: ${selectedVibe}

TUGAS ANDA:
1. **IMAGE PROMPT**: Buat prompt detail untuk AI image generator (dalam Bahasa Inggris) yang menghasilkan gambar UGC produk dengan:
   - Model ${settings.modelGender} yang menarik dan sesuai dengan produk
   - Pose ${settings.poseStyle} yang natural dan engaging
   - Sudut kamera ${settings.cameraAngle} yang profesional
   - Komposisi ${settings.composition} yang optimal
   - Background ${selectedVibe} yang sesuai dengan kategori produk
   - Lighting yang natural dan professional
   - Produk sebagai fokus utama, tidak terpotong
   - Format 9:16 untuk TikTok
   - Resolusi HD (1080x1920)

2. **TIKTOK CAPTION**: Buat caption yang engaging, natural, dan sesuai dengan gaya UGC:
   - Mulai dengan hook yang menarik
   - Sebutkan produk secara natural
   - Tambahkan emoji yang relevan
   - Ajak interaksi (pertanyaan, opini, atau CTA)
   - Maksimal 150 karakter untuk optimal engagement

3. **HASHTAGS**: Sarankan 5-8 hashtag yang relevan:
   - Mix antara popular dan niche hashtags
   - Include: #tiktokshop #fyp #affiliate
   - Sesuai dengan kategori produk
   - Format: #Hashtag tanpa spasi

4. **ENGAGEMENT TIPS**: Berikan 3 tips praktis untuk meningkatkan engagement di TikTok

Pastikan semua hasil terasa autentik seperti dibuat oleh user biasa, bukan konten promosi yang dipaksakan.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, productPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: ugcProductImageSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);
        return {
            imagePrompt: parsedJson.imagePrompt || '',
            caption: parsedJson.caption || '',
            hashtags: parsedJson.hashtags || [],
            tips: parsedJson.tips || []
        };

    } catch (error) {
        console.error("Error generating UGC product prompt:", error);
        throw new Error("Gagal menghasilkan prompt UGC produk. Silakan periksa konsol.");
    }
};

export const generateUGCProductImages = async (
    productFile: File,
    productName: string,
    settings: UGCProductSettings,
    apiKey: string
): Promise<GeneratedProductImage[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            // Generate prompt first
            const promptData = await generateUGCProductPrompt(productFile, productName, settings, apiKey);

            // Generate multiple image variations
            const images: GeneratedProductImage[] = [];
            const numberOfImages = Math.min(settings.numberOfImages, 4); // Max 4 images

            for (let i = 0; i < numberOfImages; i++) {
                // Add slight variation to each prompt for diversity
                const variationPrompt = `${promptData.imagePrompt}, variation ${i + 1}, slightly different angle, unique composition, diverse expression, varied lighting, different background details`;

                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: variationPrompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/png',
                        aspectRatio: '9:16', // TikTok format
                    },
                });

                if (!response.generatedImages || response.generatedImages.length === 0) {
                    throw new Error("AI tidak mengembalikan gambar.");
                }

                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

                images.push({
                    id: `ugc_product_${Date.now()}_${i}`,
                    url: imageUrl,
                    vibe: settings.selectedVibe,
                    settings: settings,
                    createdAt: new Date().toISOString()
                });
            }

            return images;

        } catch (error: any) {
            console.error("Error generating UGC product images:", error);

            // Check if it's a quota exceeded error (429)
            if (error?.error?.code === 429) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error("Kuota API Gemini telah habis. Silakan coba lagi nanti atau upgrade ke paket berbayar.");
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt - 1) * 2000;
                console.log(`Quota exceeded, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // For other errors, throw immediately
            throw new Error("Gagal menghasilkan gambar UGC produk. Silakan periksa konsol.");
        }
    }

    throw new Error("Gagal menghasilkan gambar UGC produk setelah beberapa percobaan.");
};

export const autoCropProduct = async (productFile: File, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const productPart = await fileToGenerativePart(productFile);

        const prompt = `Anda adalah seorang editor gambar profesional. Tugas Anda adalah menganalisis gambar produk ini dan memberikan instruksi detail untuk cropping otomatis.

INSTRUKSI CROPPING:
1. Identifikasi area produk utama dalam gambar
2. Hilangkan background putih polos atau tidak relevan
3. Pastikan produk terlihat jelas dan tidak terpotong
4. Optimalkan komposisi untuk UGC content
5. Pertahankan aspek rasio yang baik untuk TikTok (9:16)

Berikan instruksi cropping yang detail dan presisi dalam format JSON dengan struktur:
{
  "cropX": 0.1, // posisi x mulai crop (0-1)
  "cropY": 0.1, // posisi y mulai crop (0-1)
  "cropWidth": 0.8, // lebar crop (0-1)
  "cropHeight": 0.8, // tinggi crop (0-1)
  "instructions": "Instruksi detail untuk cropping"
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, productPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        cropX: { type: Type.NUMBER },
                        cropY: { type: Type.NUMBER },
                        cropWidth: { type: Type.NUMBER },
                        cropHeight: { type: Type.NUMBER },
                        instructions: { type: Type.STRING }
                    },
                    required: ["cropX", "cropY", "cropWidth", "cropHeight", "instructions"]
                }
            }
        });

        const jsonString = response.text.trim();
        const cropData = JSON.parse(jsonString);

        // Apply cropping using canvas
        return await applyImageCrop(productFile, cropData);

    } catch (error) {
        console.error("Error auto-cropping product:", error);
        throw new Error("Gagal melakukan auto-crop produk. Silakan periksa konsol.");
    }
};

const applyImageCrop = (file: File, cropData: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            try {
                const { cropX, cropY, cropWidth, cropHeight } = cropData;

                // Calculate actual pixel coordinates
                const x = Math.round(img.width * cropX);
                const y = Math.round(img.height * cropY);
                const width = Math.round(img.width * cropWidth);
                const height = Math.round(img.height * cropHeight);

                // Set canvas size to cropped dimensions
                canvas.width = width;
                canvas.height = height;

                // Apply crop
                ctx?.drawImage(img, x, y, width, height, 0, 0, width, height);

                // Convert to base64
                const croppedImageUrl = canvas.toDataURL('image/png');
                resolve(croppedImageUrl);

            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
};

export const generateUGCProductVideo = async (
    productFile: File,
    productName: string,
    settings: UGCProductSettings,
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        const productPart = await fileToGenerativePart(productFile);

        const vibeAnimations = {
            'tokyo_street': 'camera pans slowly across tokyo street, neon lights flicker, people walk by, smooth cinematic movement',
            'urban_night': 'slow zoom in on product, city lights twinkle, subtle camera shake for urban feel',
            'scandinavian_interior': 'gentle pan across minimalist room, soft natural light changes, elegant camera movement',
            'minimalist_studio': 'slow rotation around product, clean studio lighting, professional camera work',
            'metal_glass_reflection': 'close-up zoom on product reflections, light dances on surfaces, luxury camera movement',
            'rustic_wood_table': 'warm pan across wooden surface, natural light filters through, cozy atmosphere',
            'dark_textured_bg': 'dramatic slow zoom, moody lighting changes, cinematic camera work',
            'smooth_gradient': 'elegant pan with gradient color transitions, soft focus changes, premium feel',
            'moss_stone_garden': 'natural camera movement through garden, wind rustles leaves, organic flow',
            'beauty_minimalist_studio': 'soft focus pull, gentle camera movements, beauty lighting transitions',
            'geometric_shapes': 'precise camera movements along geometric lines, modern transitions, clean cuts',
            'soft_bright_bg': 'bright and airy camera work, natural light changes, fresh movement',
            'tropical_beach': 'breeze-like camera movement, water reflections, relaxed tropical flow',
            'rooftop_bar': 'city skyline pan, golden hour transitions, sophisticated camera work',
            'flower_garden': 'gentle floating camera movement, flowers sway in breeze, romantic flow',
            'aesthetic_cafe': 'cozy interior pan, warm lighting changes, inviting camera movement'
        };

        const selectedAnimation = vibeAnimations[settings.selectedVibe as keyof typeof vibeAnimations] || 'smooth cinematic camera movement';

        const prompt = `Buat prompt video untuk UGC produk TikTok dengan spesifikasi berikut:

PRODUK: ${productName}
VIBE: ${settings.selectedVibe}
DURASI: ${settings.videoDuration} detik
ANIMASI: ${selectedAnimation}

PERSYARATAN VIDEO:
- Format: 9:16 (TikTok vertical)
- Durasi: ${settings.videoDuration} detik
- Gaya: UGC natural, bukan terlalu dipoles
- Kamera: ${selectedAnimation}
- Musik: Background music yang sesuai dengan vibe
- Text overlay: Judul produk dan CTA sederhana
- Transisi: Smooth dan natural
- Ending: Call-to-action untuk engagement

Buat prompt detail dalam Bahasa Inggris yang bisa digunakan untuk AI video generator seperti VEO atau Runway. Prompt harus mencakup semua elemen visual, movement, dan atmosphere yang diperlukan.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, productPart] }
        });

        const videoPrompt = response.text.trim();

        // In a real implementation, this would call a video generation API
        // For now, return a placeholder
        return `Video prompt generated: ${videoPrompt.substring(0, 100)}...`;

    } catch (error) {
        console.error("Error generating UGC product video:", error);
        throw new Error("Gagal menghasilkan video UGC produk. Silakan periksa konsol.");
    }
};

// Spiritual Content Generator Functions

const spiritualContentSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "Judul yang menarik dan emosional untuk konten spiritual"
        },
        content: {
            type: Type.STRING,
            description: "Konten spiritual yang panjang, mendalam, dan emosional dalam Bahasa Indonesia"
        },
        religiousText: {
            type: Type.STRING,
            description: "Teks keagamaan yang relevan (ayat Al-Quran, doa, atau kata-kata bijak) jika diminta"
        },
        hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5-8 hashtag yang relevan untuk konten spiritual"
        },
        mood: {
            type: Type.STRING,
            enum: ['melancholic', 'hopeful', 'grateful', 'reflective', 'emotional', 'inspiring'],
            description: "Mood yang dominan dalam konten"
        }
    },
    required: ["title", "content", "hashtags", "mood"]
};

export const generateSpiritualContent = async (
    settings: SpiritualSettings,
    apiKey: string
): Promise<SpiritualContent> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const themeDescriptions = {
            'parental_love': 'cinta kasih orang tua kepada anak, pengorbanan, dan dedikasi',
            'faith_prayer': 'kepercayaan kepada Tuhan, doa, dan spiritualitas',
            'life_struggles': 'perjuangan hidup, kesulitan, dan ketabahan',
            'gratitude': 'rasa syukur, penghargaan, dan kebahagiaan',
            'family_bond': 'ikatan keluarga, hubungan antar anggota keluarga',
            'perseverance': 'ketekunan, pantang menyerah, dan semangat juang',
            'hope': 'harapan, optimisme, dan keyakinan akan masa depan',
            'sacrifice': 'pengorbanan, kerelaan berkorban untuk orang lain',
            'wisdom': 'kebijaksanaan, pelajaran hidup, dan nasihat',
            'reflection': 'perenungan, introspeksi, dan kontemplasi'
        };

        const moodDescriptions = {
            'melancholic': 'sedih, mengharukan, dan menyentuh hati',
            'hopeful': 'penuh harapan, optimis, dan membangkitkan semangat',
            'grateful': 'bersyukur, menghargai, dan penuh rasa terima kasih',
            'reflective': 'renungan mendalam, introspeksi, dan kontemplatif',
            'emotional': 'sangat emosional, mengharukan, dan menyentuh perasaan',
            'inspiring': 'menginspirasi, memotivasi, dan membangkitkan semangat'
        };

        const lengthDescriptions = {
            'short': '150-250 kata, 2-3 paragraf',
            'medium': '300-500 kata, 4-6 paragraf',
            'long': '600-1000 kata, 7-10 paragraf'
        };

        const audienceDescriptions = {
            'general': 'untuk semua kalangan',
            'parents': 'khusus untuk para orang tua',
            'youth': 'untuk generasi muda',
            'elderly': 'untuk lansia',
            'families': 'untuk keluarga'
        };

        const themeDesc = themeDescriptions[settings.theme];
        const moodDesc = moodDescriptions[settings.mood];
        const lengthDesc = lengthDescriptions[settings.length];
        const audienceDesc = audienceDescriptions[settings.targetAudience];

        let prompt = `Anda adalah seorang penulis konten spiritual yang sangat berbakat dan mendalam. Buat konten spiritual yang sangat emosional dan menyentuh hati dalam Bahasa Indonesia.

TEMA: ${themeDesc}
MOOD: ${moodDesc}
PANJANG: ${lengthDesc}
AUDIENS: ${audienceDesc}

PERSYARATAN KONTEN:
1. Buat konten yang sangat panjang dan mendalam (${lengthDesc})
2. Gunakan bahasa yang emosional, menyentuh hati, dan mudah dipahami
3. Sertakan elemen personal dan relatable
4. Gunakan gaya penulisan seperti cerita kehidupan di media sosial
5. Buat konten yang bisa membuat pembaca terharu dan terinspirasi
6. Gunakan paragraf pendek untuk kemudahan membaca di media sosial
7. Sertakan emosi yang kuat dan autentik
8. Buat konten yang bisa viral dan dibagikan`;

        if (settings.includeReligiousText) {
            prompt += `
9. Sertakan teks keagamaan yang relevan (ayat Al-Quran, doa, atau kata-kata bijak)
10. Integrasikan teks keagamaan dengan natural dalam konten`;
        }

        if (settings.customPrompt) {
            prompt += `
11. Pertimbangkan konteks khusus: ${settings.customPrompt}`;
        }

        prompt += `

CONTOH GAYA PENULISAN:
- Mulai dengan kalimat yang kuat dan emosional
- Gunakan "Aku", "Kita", atau "Saya" untuk personal touch
- Sertakan detail emosional dan pengalaman pribadi
- Akhiri dengan pesan yang menginspirasi atau mengharukan
- Gunakan paragraf pendek (1-3 kalimat per paragraf)
- Sertakan emoji atau simbol yang relevan jika perlu

HASHTAG:
- Gunakan hashtag yang relevan dengan tema spiritual dan kehidupan
- Sertakan #fyp #story #ceritakehidupan #nasihatkehidupan
- Tambahkan hashtag spesifik sesuai tema

Format hasil sebagai JSON sesuai dengan skema yang disediakan.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: spiritualContentSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        const spiritualContent: SpiritualContent = {
            id: `spiritual_${Date.now()}`,
            title: parsedJson.title || 'Konten Spiritual',
            content: parsedJson.content || '',
            theme: settings.theme,
            mood: parsedJson.mood || settings.mood,
            length: settings.length,
            includeReligiousText: settings.includeReligiousText,
            religiousText: parsedJson.religiousText || undefined,
            hashtags: parsedJson.hashtags || [],
            createdAt: new Date().toISOString()
        };

        return spiritualContent;

    } catch (error) {
        console.error("Error generating spiritual content:", error);
        throw new Error("Gagal menghasilkan konten spiritual. Silakan periksa konsol.");
    }
};

export const generateSpiritualContentVariations = async (
    originalContent: SpiritualContent,
    apiKey: string
): Promise<SpiritualContent[]> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Buat 3 variasi konten spiritual berdasarkan konten asli berikut:

KONTEN ASLI:
Judul: ${originalContent.title}
Tema: ${originalContent.theme}
Mood: ${originalContent.mood}
Panjang: ${originalContent.length}

KONTEN:
${originalContent.content}

Buat 3 variasi yang:
1. Mempertahankan tema dan mood yang sama
2. Menggunakan pendekatan yang berbeda
3. Tetap emosional dan menyentuh hati
4. Panjang yang sama dengan konten asli
5. Menggunakan gaya penulisan yang berbeda

Format hasil sebagai array JSON dengan struktur yang sama.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        variations: {
                            type: Type.ARRAY,
                            items: spiritualContentSchema
                        }
                    },
                    required: ["variations"]
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        const variations: SpiritualContent[] = (parsedJson.variations || []).map((variation: any, index: number) => ({
            id: `spiritual_variation_${Date.now()}_${index}`,
            title: variation.title || `Variasi ${index + 1}`,
            content: variation.content || '',
            theme: originalContent.theme,
            mood: variation.mood || originalContent.mood,
            length: originalContent.length,
            includeReligiousText: originalContent.includeReligiousText,
            religiousText: variation.religiousText || originalContent.religiousText,
            hashtags: variation.hashtags || originalContent.hashtags,
            createdAt: new Date().toISOString()
        }));

        return variations;

    } catch (error) {
        console.error("Error generating spiritual content variations:", error);
        throw new Error("Gagal menghasilkan variasi konten spiritual. Silakan periksa konsol.");
    }
};
