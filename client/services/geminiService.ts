import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile, ChatMessage } from "../types";
import { uint8ArrayToBase64 } from "../lib/utils";

// Initialize Gemini Client
// Note: In a real production app, ensure this is handled securely.
// We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Use gemini-3-flash-preview as recommended for text tasks
const MODEL_NAME = 'gemini-3-flash-preview';

export const analyzePDF = async (file: UploadedFile): Promise<{ summary: string; keyPoints: string[] }> => {
  try {
    const base64Data = uint8ArrayToBase64(file.data);
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: `You are PDFBull, an expert document analyst. 
            Please analyze this document and provide:
            1. A concise summary (max 3 paragraphs).
            2. A list of 5 key points or takeaways.
            
            Return the response in JSON format.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const chatWithPDF = async (
  file: UploadedFile, 
  history: ChatMessage[], 
  currentMessage: string
): Promise<string> => {
  try {
    // Construct the message history for a "stateless" chat request that includes the file context
    // This ensures the model always has access to the PDF content without needing a stateful session
    
    const base64Data = uint8ArrayToBase64(file.data);
    const contents = [];

    // System/Context Message (The PDF)
    contents.push({
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        },
        {
          text: "This is the document we are discussing. Answer all following questions based on this document."
        }
      ]
    });

    // Confirmation from model (simulated history for structure)
    contents.push({
      role: 'model',
      parts: [{ text: "Understood. I have analyzed the document. What would you like to know?" }]
    });

    // Append recent history to maintain conversation flow
    // We limit history to last 10 turns to save tokens/bandwidth
    history.slice(-10).forEach(msg => {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    });

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: currentMessage }]
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents as any // Casting to avoid strict type conflicts with helper structures
    });

    return response.text || "I couldn't generate a response.";

  } catch (error) {
    console.error("Chat Error:", error);
    throw new Error("Failed to get response from PDFBull.");
  }
};