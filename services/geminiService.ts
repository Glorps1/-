import { GoogleGenAI, Chat, Modality, Type } from "@google/genai";
import { Question, VideoRecommendation, QuizQuestion } from "../types";

// Helper to get the best available API key
// Prioritizes a manually entered key (localStorage) over the build-time env var
export const getStoredApiKey = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_GEMINI_KEY') || process.env.API_KEY || '';
  }
  return process.env.API_KEY || '';
};

export const saveApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('USER_GEMINI_KEY', key);
  }
};

// Dynamic client creator
const getAiClient = () => {
  const key = getStoredApiKey();
  return new GoogleGenAI({ apiKey: key });
};

// Simple in-memory cache for audio to prevent re-generation
const audioCache = new Map<number, string>();

const handleApiError = (error: any, context: string) => {
  console.error(`${context} Error:`, error);
  const msg = error.toString().toLowerCase();
  
  if (!getStoredApiKey()) {
    throw new Error("API Key отсутствует. Нажмите на иконку ключа 🔑 вверху, чтобы добавить его.");
  }
  
  if (msg.includes('403') || msg.includes('permission denied') || msg.includes('access denied')) {
    throw new Error("Ошибка доступа (403). Попробуйте обновить API ключ.");
  }
  
  if (msg.includes('429') || msg.includes('quota')) {
    throw new Error("Превышен лимит запросов. Подождите минуту.");
  }

  throw new Error("Ошибка соединения с AI. Проверьте интернет или VPN.");
};

// Main explanation generator with Fallback logic
export const generateExplanation = async (question: Question): Promise<string> => {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error("API Key отсутствует. Введите его в настройках.");

  const ai = getAiClient();
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

  // Strategy: Try Pro model with Thinking -> Fallback to Flash without Thinking
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 1024 } }
    });
    return response.text || "Ошибка получения ответа.";
  } catch (error: any) {
    console.warn("Primary model failed, attempting fallback...", error.message);
    
    // Fallback
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Fallback to Flash
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 0 } } // Disable thinking for reliability
      });
      return response.text || "Ошибка получения ответа.";
    } catch (fallbackError) {
      handleApiError(fallbackError, "Explanation");
      return "";
    }
  }
};

// Audio Explanation generator (TTS)
export const generateAudioExplanation = async (question: Question): Promise<string> => {
  if (audioCache.has(question.id)) {
    return audioCache.get(question.id)!;
  }

  try {
    const ai = getAiClient();
    if (!getStoredApiKey()) throw new Error("API Key отсутствует");

    const scriptModel = 'gemini-3-flash-preview';
    const scriptPrompt = `
      Объясни суть вопроса по физике: "${question.text}".
      
      Требования:
      - Объем: 2-3 предложения (максимум 20 секунд речи).
      - Стиль: Простой, разговорный, как друг другу.
      - Без формул. Без вступлений. Сразу суть.
    `;

    const scriptResponse = await ai.models.generateContent({
        model: scriptModel,
        contents: scriptPrompt,
        config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    
    const textToSpeak = scriptResponse.text;
    if (!textToSpeak) throw new Error("Failed to generate script");

    // TTS
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
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
    if (!candidates || candidates.length === 0) throw new Error("No candidates");

    const audioData = candidates[0].content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio data");
    
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
    const ai = getAiClient();
    if (!getStoredApiKey()) return [];

    const prompt = `
      Для вопроса по физике: "${question.text}"
      Предложи 3 лучших поисковых запроса для YouTube.
      Верни ТОЛЬКО JSON массив: [{ "query": "...", "description": "...", "type": "lecture" }]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    const ai = getAiClient();
    if (!getStoredApiKey()) throw new Error("API Key отсутствует");
    
    const prompt = `
      Create a quiz with 5 multiple-choice questions for: "${question.text}".
      Requirements: 4 options per question, 1 correct answer.
      Return purely JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    handleApiError(error, "Quiz Generation");
    return [];
  }
};

// Chat session creator
export const createChatSession = (question: Question) => {
  if (!getStoredApiKey()) throw new Error("API Key missing");
  const ai = getAiClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Ты помощник по физике. Тема: "${question.text}". Отвечай кратко.`
    }
  });
};