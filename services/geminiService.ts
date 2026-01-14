import { GoogleGenAI, Chat, Modality, Type } from "@google/genai";
import { Question, VideoRecommendation, QuizQuestion } from "../types";

// Fallback to avoid crash on init, but requests will fail if key is missing
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// Simple in-memory cache for audio to prevent re-generation
const audioCache = new Map<number, string>();

const handleApiError = (error: any, context: string) => {
  console.error(`${context} Error:`, error);
  const msg = error.toString().toLowerCase();
  
  if (!apiKey) {
    throw new Error("API Key не найден. Добавьте переменную API_KEY в настройки Vercel/Netlify.");
  }
  
  if (msg.includes('403') || msg.includes('permission denied') || msg.includes('access denied')) {
    throw new Error("Ошибка доступа (403). Проверьте API Key или лимиты квот.");
  }
  
  if (msg.includes('429') || msg.includes('quota')) {
    throw new Error("Превышен лимит запросов. Подождите минуту.");
  }

  throw new Error("Ошибка соединения с AI. Попробуйте позже.");
};

// Main explanation generator
export const generateExplanation = async (question: Question): Promise<string> => {
  try {
    if (!apiKey) throw new Error("API Key отсутствует");

    const modelId = 'gemini-3-pro-preview'; 
    const prompt = `
      Ты — элитный репетитор по физике.
      Вопрос: "${question.text}"
      
      Дай глубокое, но кристально понятное объяснение.
      Структура:
      1. 🟣 **Интуиция**: Суть явления простыми словами.
      2. 📐 **Теория**: Формулы (LaTeX), законы.
      3. ✍️ **Практика**: Если есть задача - полное решение. Если нет - пример применения.
      
      Используй LaTeX для формул ($...$ и $$...$$).
      Стиль: Академический, вдохновляющий.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 1024 } }
    });

    return response.text || "Ошибка получения ответа.";
  } catch (error) {
    handleApiError(error, "Explanation");
    return ""; // Unreachable due to throw
  }
};

// Audio Explanation generator (TTS)
export const generateAudioExplanation = async (question: Question): Promise<string> => {
  // Check cache first
  if (audioCache.has(question.id)) {
    return audioCache.get(question.id)!;
  }

  try {
    if (!apiKey) throw new Error("API Key отсутствует");

    // Step 1: Generate the script using a text model
    // Optimized for speed: Short length, no thinking budget
    const scriptModel = 'gemini-3-flash-preview';
    const scriptPrompt = `
      Объясни суть вопроса по физике: "${question.text}".
      
      Требования:
      - Объем: 2-3 предложения (максимум 20 секунд речи).
      - Стиль: Простой, разговорный, как друг другу.
      - Без формул. Без вступлений ("Конечно, вот ответ"). Сразу суть.
    `;

    const scriptResponse = await ai.models.generateContent({
        model: scriptModel,
        contents: scriptPrompt,
        config: { thinkingConfig: { thinkingBudget: 0 } } // Disable thinking for speed
    });
    
    const textToSpeak = scriptResponse.text;
    if (!textToSpeak) throw new Error("Failed to generate script");

    // Step 2: Generate Audio using TTS model
    const ttsModel = 'gemini-2.5-flash-preview-tts';
    
    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: textToSpeak }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' } 
          },
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error("No candidates returned");
    }

    const audioData = candidates[0].content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
        throw new Error("No audio data in response");
    }
    
    // Save to cache
    audioCache.set(question.id, audioData);

    return audioData;
  } catch (error) {
    handleApiError(error, "Audio Generation");
    return "";
  }
};

// Video recommendations generator
export const getVideoRecommendations = async (question: Question): Promise<VideoRecommendation[]> => {
  try {
    if (!apiKey) return [];

    const modelId = 'gemini-3-flash-preview';
    const prompt = `
      Для вопроса по физике: "${question.text}"
      Предложи 3 лучших поисковых запроса для YouTube, чтобы студент мог посмотреть видео-урок.
      
      Верни ТОЛЬКО JSON массив:
      [
        { "query": "точный текст запроса", "description": "что студент увидит", "type": "lecture" | "problem_solving" | "experiment" }
      ]
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Video Recs Error:", error);
    return [];
  }
};

// Quiz Generator
export const generateQuiz = async (question: Question): Promise<QuizQuestion[]> => {
  try {
    if (!apiKey) throw new Error("API Key отсутствует");
    
    const modelId = 'gemini-3-flash-preview';
    const prompt = `
      Create a quiz with 5 multiple-choice questions to test the student's understanding of this physics topic: "${question.text}".
      
      Requirements:
      - Questions should vary in difficulty (conceptual and simple calculation).
      - 4 options per question.
      - One correct answer.
      - Brief explanation for the correct answer.
      
      Return purely JSON.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctAnswer: { 
                type: Type.INTEGER, 
                description: "Index of the correct option (0-3)" 
              },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    handleApiError(error, "Quiz Generation");
    return [];
  }
};

// Chat session creator
export const createChatSession = (question: Question) => {
  if (!apiKey) {
      throw new Error("API Key missing");
  }
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Ты помощник по физике. Текущий контекст вопроса: "${question.text}". Отвечай кратко, по делу, помогай разобраться в нюансах. Испольуй LaTeX для формул.`
    }
  });
};