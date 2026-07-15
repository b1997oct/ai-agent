import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { getSecret } from 'astro:env/server';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { messages, model, temperature } = await request.json();

        // Access the NVIDIA API key from environment variables (with process.env fallback)
        const apiKey = getSecret("NVIDIA") || process.env.NVIDIA;

        if (!apiKey) {
            return Response.json({
                error: "NVIDIA API Key not found. Please set 'NVIDIA' in your .env file."
            }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://integrate.api.nvidia.com/v1',
        });

        // Default model to z-ai/glm-5.2 if not specified
        const selectedModel = model || "z-ai/glm-5.2";

        const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: messages,
            temperature: temperature !== undefined ? temperature : 0.7,
            max_tokens: 4096,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        return Response.json({ response: responseText });
    } catch (error: any) {
        console.error("NVIDIA API Error:", error);
        return Response.json({
            error: error.message || "An unexpected error occurred while communicating with the NVIDIA API."
        }, { status: 500 });
    }
};
