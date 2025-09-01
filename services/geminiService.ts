/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


// --- Helper Functions ---

/**
 * Creates a fallback prompt to use when the primary one is blocked.
 * @param context The context string (e.g., "1950s", "Viking Warrior", "Rajasthani Attire").
 * @returns The fallback prompt string.
 */
function getFallbackPrompt(context: string): string {
    // A simple check to see if it looks like a structured era from the "Quick Trip" list.
    const isEra = /\d{4}s|\b(viking|roman|samurai|detective|hippie|punk|grunge|pharaoh|gladiator|knight|artist|noble|pirate|explorer|flapper|star)\b/i.test(context);
    const qualityPrompt = `The final output should be an award-winning photograph of masterpiece quality, with cinematic composition and lighting. The image must be hyper-detailed, photorealistic, and in very high quality 8k resolution.`;

    if (isEra) {
        return `Create a photograph of the person in this image as if they were living in the ${context} era. The photograph should capture the distinct fashion, hairstyles, and overall atmosphere of that time period in great detail. ${qualityPrompt}`;
    }
    // Generic fallback for cultural or imagination prompts
    return `Create a photorealistic image reimagining the person in this image according to this theme: "${context}". Ensure the final image respects the described elements. ${qualityPrompt}`;
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imagePart The image part of the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imagePart: object, textPart: object): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
        } catch (error) {
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    // This should be unreachable due to the loop and throw logic above.
    throw new Error("Gemini API call failed after all retries.");
}


/**
 * Generates a styled image from a source image and a prompt.
 * It includes a fallback mechanism for prompts that might be blocked.
 * @param imageDataUrl A data URL string of the source image (e.g., 'data:image/png;base64,...').
 * @param prompt The prompt to guide the image generation.
 * @param context The specific context string (era, attire, custom theme), used for the fallback prompt.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateDecadeImage(imageDataUrl: string, prompt: string, context: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    // --- First attempt with the original prompt ---
    try {
        console.log("Attempting generation with original prompt...");
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry(imagePart, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const isNoImageError = errorMessage.includes("The AI model responded with text instead of an image");

        if (isNoImageError) {
            console.warn("Original prompt was likely blocked. Trying a fallback prompt.");

            // --- Second attempt with the fallback prompt ---
            try {
                const fallbackPrompt = getFallbackPrompt(context);
                console.log(`Attempting generation with fallback prompt for ${context}...`);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry(imagePart, fallbackTextPart);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Fallback prompt also failed.", fallbackError);
                const finalErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                throw new Error(`The AI model failed with both original and fallback prompts. Last error: ${finalErrorMessage}`);
            }
        } else {
            // This is for other errors, like a final internal server error after retries.
            console.error("An unrecoverable error occurred during image generation.", error);
            throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
        }
    }
}

/**
 * Generates a creative suggestion for a specific category using the Gemini API.
 * @param category The category for the suggestion (e.g., 'scenery', 'attire', 'pose').
 * @returns A promise that resolves to a string with the creative suggestion.
 */
export async function generateSurpriseMeSuggestion(category: 'scenery' | 'attire' | 'pose' | 'hairStyle' | 'eyeStyle'): Promise<string> {
    let prompt = '';
    const baseInstruction = `Generate a short, creative, and visually rich description suitable for an AI image generation prompt. Be concise, under 15 words, and cover a wide range of genres like fantasy, sci-fi, historical, and surreal. Do not use quotes or introductory phrases. The category is: `;
    switch (category) {
        case 'scenery':
            prompt = baseInstruction + 'a scene or location.';
            break;
        case 'attire':
            prompt = baseInstruction + 'an outfit or clothing style.';
            break;
        case 'pose':
            prompt = baseInstruction + 'a character\'s pose or action. Make it under 10 words.';
            break;
        case 'hairStyle':
            prompt = baseInstruction + 'a unique hair style. Make it under 10 words.';
            break;
        case 'eyeStyle':
            prompt = baseInstruction + 'a character\'s eye style or expression. Make it under 10 words.';
            break;
        default:
            throw new Error("Invalid category for surprise me suggestion.");
    }

    try {
        console.log(`Generating suggestion for category: ${category}`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const suggestion = response.text.trim();
        if (!suggestion) {
            throw new Error("Received an empty suggestion from the API.");
        }
        return suggestion;
    } catch (error) {
        console.error(`Error generating surprise me suggestion for ${category}:`, error);
        throw new Error(`Failed to get a suggestion. Please try again.`);
    }
}

/**
 * Refines user's raw imagination inputs into a cohesive prompt.
 * @param inputs The raw inputs from the imagination form.
 * @returns A promise that resolves to a refined prompt string.
 */
export async function refineImaginationPrompt(inputs: { [key: string]: string }): Promise<string> {
    const { scenery, attire, pose, hairStyle, eyeStyle, figureSize, style, aspectRatio, imageFraming } = inputs;
    
    const promptParts = [];
    promptParts.push(`The image framing is a ${imageFraming}.`);
    promptParts.push(`The aspect ratio is ${aspectRatio}.`);
    promptParts.push(`The setting is: ${scenery}.`);
    promptParts.push(`They are wearing: ${attire}.`);
    if (pose) promptParts.push(`Their pose is: ${pose}.`);
    if (hairStyle) promptParts.push(`Their hair style is: ${hairStyle}.`);
    if (eyeStyle) promptParts.push(`Their eye style is: ${eyeStyle}.`);
    if (figureSize && figureSize !== 'Unspecified') {
         promptParts.push(`Their body type is described as: ${figureSize}.`);
    }
    if (style) promptParts.push(`The artistic style is: ${style}.`);

    const rawPrompt = `Reimagine the person in this photo. ${promptParts.join(' ')}`;

    const refinementInstruction = `You are an expert prompt engineer. Your task is to refine the following user-provided details into a single, cohesive, and descriptive paragraph for an AI image generator. Combine the elements naturally. Do not add any new concepts. Focus on making the description vivid and coherent. Do not use markdown or special formatting. The user's details are: "${rawPrompt}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: refinementInstruction,
        });

        const refinedPrompt = response.text.trim();
        if (!refinedPrompt) {
            console.warn("AI refinement returned empty, using raw prompt.");
            return rawPrompt;
        }
        return refinedPrompt;

    } catch(error) {
        console.error("Error refining imagination prompt, using raw prompt.", error);
        return rawPrompt;
    }
}
