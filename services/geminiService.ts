
import { GoogleGenAI } from "@google/genai";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const enhancePrompt = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Transform this simple image prompt into a detailed, professional AI art prompt for high-quality results. Focus on lighting, texture, artistic style, and composition. Keep it concise. Original prompt: "${prompt}"`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 200,
    }
  });
  return response.text || prompt;
};

export const generateImage = async (prompt: string, style: string, aspectRatio: string = '1:1'): Promise<string> => {
  const ai = getAIClient();
  const finalPrompt = style === 'None' ? prompt : `${prompt}, in the style of ${style}, highly detailed, professional composition`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: finalPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any
      }
    }
  });

  let imageUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) throw new Error('No image was generated');
  return imageUrl;
};

export const upscaleImage = async (base64Data: string): Promise<string> => {
  const ai = getAIClient();
  const data = base64Data.split(',')[1];
  const mimeType = base64Data.split(';')[0].split(':')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: "Increase resolution, enhance details, and sharpen this image significantly while maintaining the original subject and composition." }
      ]
    }
  });

  let enhancedUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      enhancedUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  return enhancedUrl || base64Data;
};

export const generateMotion = async (base64Image: string, prompt: string, aspectRatio: string = '1:1'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const data = base64Image.split(',')[1];
  const mimeType = base64Image.split(';')[0].split(':')[1];

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Add cinematic motion and subtle animation to this scene: ${prompt}`,
    image: {
      imageBytes: data,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio === '1:1' ? '16:9' : (aspectRatio as any) // Veo supports 16:9/9:16 primarily
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error('Failed to generate motion');

  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
