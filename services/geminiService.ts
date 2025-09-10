import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedMetadata, ReactionStyle, OutputLength, VeoPrompts, ToneAnalysisResult, RepurposingIdea, ImageToVideoResult, QuoteCategory } from '../types';

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
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        throw new Error("Gagal menghasilkan gambar. Silakan periksa konsol.");
    }
};

export const editImageWithGemini = async (files: File[], prompt: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key Gemini diperlukan.");
    }
    const ai = new GoogleGenAI({ apiKey });

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

    } catch (error) {
        console.error("Error editing image with Gemini:", error);
        throw new Error("Gagal mengedit gambar. Silakan periksa konsol.");
    }
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
