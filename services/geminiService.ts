import { GoogleGenAI, Chat } from "@google/genai";
import { Question, VideoRecommendation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple in-memory cache for audio to prevent re-generation
const audioCache = new Map<number, string>();

// Main explanation generator
export const generateExplanation = async (question: Question): Promise<string> => {
  try {
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
    console.error("Explanation Error:", error);
    throw new Error("Не удалось загрузить объяснение.");
  }
};

// Audio Explanation generator (TTS)
export const generateAudioExplanation = async (question: Question): Promise<string> => {
  // Check cache first
  if (audioCache.has(question.id)) {
    return audioCache.get(question.id)!;
  }

  try {
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
        responseModalities: ['AUDIO' as any], 
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
    console.error("Audio Generation Error Details:", error);
    throw new Error("Не удалось сгенерировать аудио.");
  }
};

// Video recommendations generator
export const getVideoRecommendations = async (question: Question): Promise<VideoRecommendation[]> => {
  try {
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

// Chat session creator
export const createChatSession = (question: Question) => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Ты помощник по физике. Текущий контекст вопроса: "${question.text}". Отвечай кратко, по делу, помогай разобраться в нюансах. Испольуй LaTeX для формул.`
    }
  });
};