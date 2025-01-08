import { elizaLogger, generateText } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
    ModelClass
} from "@elizaos/core";
import { generateImage } from "@elizaos/core";
import fs from "fs";
import path from "path";
import { validateImageGenConfig } from "./environment";

export function saveBase64Image(base64Data: string, filename: string): string {
    // Create generatedImages directory if it doesn't exist
    const imageDir = path.join(process.cwd(), "generatedImages");
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

    // Remove the data:image/png;base64 prefix if it exists
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Create full file path
    const filepath = path.join(imageDir, `${filename}.png`);

    // Save the file
    fs.writeFileSync(filepath, imageBuffer);

    return filepath;
}

export async function saveHeuristImage(
    imageUrl: string,
    filename: string
): Promise<string> {
    const imageDir = path.join(process.cwd(), "generatedImages");
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Create full file path
    const filepath = path.join(imageDir, `${filename}.png`);

    // Save the file
    fs.writeFileSync(filepath, imageBuffer);

    return filepath;
}

const imageGeneration: Action = {
    name: "GENERATE_IMAGE",
    similes: [
        "IMAGE_GENERATION",
        "IMAGE_GEN",
        "CREATE_IMAGE",
        "MAKE_PICTURE",
        "GENERATE_IMAGE",
        "GENERATE_A",
        "DRAW",
        "DRAW_A",
        "MAKE_A",
    ],
    description: "Generate an image to go along with the message.",
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        console.time("generate-image-action")
        await validateImageGenConfig(runtime);
        console.timeEnd("generate-image-action")

        const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY");
        const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY");
        const heuristApiKeyOk = !!runtime.getSetting("HEURIST_API_KEY");
        const falApiKeyOk = !!runtime.getSetting("FAL_API_KEY");
        const openAiApiKeyOk = !!runtime.getSetting("OPENAI_API_KEY");
        const veniceApiKeyOk = !!runtime.getSetting("VENICE_API_KEY");
        const livepeerGatewayUrlOk = !!runtime.getSetting("LIVEPEER_GATEWAY_URL");

        return (
            anthropicApiKeyOk ||
            togetherApiKeyOk ||
            heuristApiKeyOk ||
            falApiKeyOk ||
            openAiApiKeyOk ||
            veniceApiKeyOk ||
            livepeerGatewayUrlOk
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: {
            width?: number;
            height?: number;
            count?: number;
            negativePrompt?: string;
            numIterations?: number;
            guidanceScale?: number;
            seed?: number;
            modelId?: string;
            jobId?: string;
            stylePreset?: string;
            hideWatermark?: boolean;
        },
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        const CONTENT = message.content.text;
        const IMAGE_SYSTEM_PROMPT = `You are an expert in writing prompts for AI art generation. You excel at creating detailed and creative visual descriptions. Incorporating specific elements naturally. Always aim for clear, descriptive language that generates a creative picture. Your output should only contain the description of the image contents, but NOT an instruction like "create an image that..."`;
        const STYLE = "futuristic with vibrant colors";

        const IMAGE_PROMPT_INPUT = `You are tasked with generating an image prompt based on a content and a specified style.
            Your goal is to create a detailed and vivid image prompt that captures the essence of the content while incorporating an appropriate subject based on your analysis of the content.\n\nYou will be given the following inputs:\n<content>\n${CONTENT}\n</content>\n\n<style>\n${STYLE}\n</style>\n\nA good image prompt consists of the following elements:\n\n

1. Main subject
2. Detailed description
3. Style
4. Lighting
5. Composition
6. Quality modifiers

To generate the image prompt, follow these steps:\n\n1. Analyze the content text carefully, identifying key themes, emotions, and visual elements mentioned or implied.
\n\n

2. Determine the most appropriate main subject by:
   - Identifying concrete objects or persons mentioned in the content
   - Analyzing the central theme or message
   - Considering metaphorical representations of abstract concepts
   - Selecting a subject that best captures the content's essence

3. Determine an appropriate environment or setting based on the content's context and your chosen subject.

4. Decide on suitable lighting that enhances the mood or atmosphere of the scene.

5. Choose a color palette that reflects the content's tone and complements the subject.

6. Identify the overall mood or emotion conveyed by the content.

7. Plan a composition that effectively showcases the subject and captures the content's essence.

8. Incorporate the specified style into your description, considering how it affects the overall look and feel of the image.

9. Use concrete nouns and avoid abstract concepts when describing the main subject and elements of the scene.

Construct your image prompt using the following structure:\n\n
1. Main subject: Describe the primary focus of the image based on your analysis
2. Environment: Detail the setting or background
3. Lighting: Specify the type and quality of light in the scene
4. Colors: Mention the key colors and their relationships
5. Mood: Convey the overall emotional tone
6. Composition: Describe how elements are arranged in the frame
7. Style: Incorporate the given style into the description

Ensure that your prompt is detailed, vivid, and incorporates all the elements mentioned above while staying true to the content and the specified style. LIMIT the image prompt 50 words or less. \n\nWrite a prompt. Only include the prompt and nothing else.`;

        const imagePrompt = await generateText({
            runtime,
            context: IMAGE_PROMPT_INPUT,
            modelClass: ModelClass.MEDIUM,
            customSystemPrompt: IMAGE_SYSTEM_PROMPT,
        });

        elizaLogger.log("Image prompt received:", imagePrompt);
        const imageSettings = runtime.character?.settings?.imageSettings || {};
        elizaLogger.log("Image settings:", imageSettings);

        const res: { image: string; caption: string }[] = [];

        elizaLogger.log("Generating image with prompt:", imagePrompt);
        const images = await generateImage(
            {
                prompt: imagePrompt,
                width: options.width || imageSettings.width || 1024,
                height: options.height || imageSettings.height || 1024,
                ...(options.count != null || imageSettings.count != null ? { count: options.count || imageSettings.count || 1 } : {}),
                ...(options.negativePrompt != null || imageSettings.negativePrompt != null ? { negativePrompt: options.negativePrompt || imageSettings.negativePrompt } : {}),
                ...(options.numIterations != null || imageSettings.numIterations != null ? { numIterations: options.numIterations || imageSettings.numIterations } : {}),
                ...(options.guidanceScale != null || imageSettings.guidanceScale != null ? { guidanceScale: options.guidanceScale || imageSettings.guidanceScale } : {}),
                ...(options.seed != null || imageSettings.seed != null ? { seed: options.seed || imageSettings.seed } : {}),
                ...(options.modelId != null || imageSettings.modelId != null ? { modelId: options.modelId || imageSettings.modelId } : {}),
                ...(options.jobId != null || imageSettings.jobId != null ? { jobId: options.jobId || imageSettings.jobId } : {}),
                ...(options.stylePreset != null || imageSettings.stylePreset != null ? { stylePreset: options.stylePreset || imageSettings.stylePreset } : {}),
                ...(options.hideWatermark != null || imageSettings.hideWatermark != null ? { hideWatermark: options.hideWatermark || imageSettings.hideWatermark } : {}),
            },
            runtime
        );

        if (images.success && images.data && images.data.length > 0) {
            elizaLogger.log(
                "Image generation successful, number of images:",
                images.data.length
            );
            for (let i = 0; i < images.data.length; i++) {
                const image = images.data[i];

                // Save the image and get filepath
                const filename = `generated_${Date.now()}_${i}`;

                // Choose save function based on image data format
                const filepath = image.startsWith("http")
                    ? await saveHeuristImage(image, filename)
                    : saveBase64Image(image, filename);

                elizaLogger.log(`Processing image ${i + 1}:`, filename);

                //just dont even add a caption or a description just have it generate & send
                /*
                try {
                    const imageService = runtime.getService(ServiceType.IMAGE_DESCRIPTION);
                    if (imageService && typeof imageService.describeImage === 'function') {
                        const caption = await imageService.describeImage({ imageUrl: filepath });
                        captionText = caption.description;
                        captionTitle = caption.title;
                    }
                } catch (error) {
                    elizaLogger.error("Caption generation failed, using default caption:", error);
                }*/

                const _caption = "...";
                /*= await generateCaption(
                    {
                        imageUrl: image,
                    },
                    runtime
                );*/

                res.push({ image: filepath, caption: "..." }); //caption.title });

                elizaLogger.log(
                    `Generated caption for image ${i + 1}:`,
                    "..." //caption.title
                );
                //res.push({ image: image, caption: caption.title });

                callback(
                    {
                        text: "...", //caption.description,
                        attachments: [
                            {
                                id: crypto.randomUUID(),
                                url: filepath,
                                title: "Generated image",
                                source: "imageGeneration",
                                description: "...", //caption.title,
                                text: "...", //caption.description,
                                contentType: "image/png",
                            },
                        ],
                    },
                    [
                        {
                            attachment: filepath,
                            name: `${filename}.png`,
                        },
                    ]
                );
            }
        } else {
            elizaLogger.error("Image generation failed or returned no data.");
        }
    },
    examples: [
        // TODO: We want to generate images in more abstract ways, not just when asked to generate an image

        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a cat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a dog" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a dog",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Create an image of a cat with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Make an image of a dog with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a dog with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Paint an image of a cat with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
    ],
} as Action;

export const imageGenerationPlugin: Plugin = {
    name: "imageGeneration",
    description: "Generate images",
    actions: [imageGeneration],
    evaluators: [],
    providers: [],
};

const meme_knowledge = `
Knowledge Blobs for Bino: Meme Creation

Blob 1: What Are Memes?
Memes are cultural, visual, and textual tools designed to communicate humor, sarcasm, or bold ideas in a simple and shareable way. In crypto, memes are the glue of the community—taking complex ideas like decentralization or tokenomics and turning them into relatable, laugh-out-loud moments. The best memes are bold, punchy, and packed with wit, connecting instantly with the audience.

Blob 2: Why Memes Matter in Crypto
Memes are the lifeblood of crypto culture. They fuel engagement, simplify complex ideas, and spread like wildfire across communities. A killer meme can turn an obscure project into a talking point or help explain why IoTeX and DePIN are lightyears ahead of the competition. The secret? Humor, relatability, and impeccable timing. Memes are about taking shots at inefficiency, celebrating wins, and roasting FUDders in the most epic way possible.

Blob 3: Anatomy of a Perfect Meme
A great meme hits hard and fast. Start with a recognizable template—something that instantly conveys the tone (funny, sarcastic, savage). Add short but impactful text that simplifies a message or event. Labels on characters? Perfect. A bold caption? Even better. Keep it visual—think clean designs, vibrant colors, and expressive characters. A good meme doesn’t explain—it shows. Remember: If it doesn’t spark a laugh or a “so true,” it’s not good enough.

Blob 4: Meme Templates for Crypto
Meme templates are like blank canvases for the crypto world. Each template comes preloaded with cultural punch—you just need to IoTeX-ify it.

Blob 5: Bino’s Meme Philosophy
Meme-making is an art, and Bino’s brush is sarcasm dipped in blockchain truth. Every meme should have layers—humor on the surface but a deeper truth underneath. It’s not just about being funny; it’s about educating, hyping, and driving the DePIN narrative forward. A meme isn’t just an image—it’s a statement. Whether it’s roasting Ethereum gas fees, flexing IoTeX scalability, or hyping DePIN adoption, every meme should scream: IoTeX is inevitable.

Blob 6: Common Meme Mistakes
Not every meme lands. Too much text? No one’s reading it. Too niche? People will scroll past. Bad quality? You just killed your vibe. A bad meme is one that tries too hard or fails to connect. The key is to keep it clean, relatable, and bold. If the meme doesn’t slap within three seconds, it’s a miss. Bino doesn’t miss—so aim for visual excellence and savage simplicity.

Blob 7: Meme Action in Crypto Drama
When $BTC pumps or FUD floods the chat, memes are the first responders. Picture a market crash? Drop a “This Is Fine” meme to mock the chaos. FUD about IoTeX? A SpongeBob meme dunking on doubters works every time. Memes are instant reactions—condensing big emotions into viral simplicity. Use them to calm, hype, or educate the crowd, but always stay sharp.

Blob 8: Bino’s Secret Sauce
Bino memes are a mix of arrogance, wit, and IoTeX worship. Every meme should have a bold message: “IoTeX is leading the DePIN revolution,” “Centralization is dying,” or “Ethereum gas fees are a joke.” Be fearless. Dunk on inefficiency. Roast FUDders. And above all, keep IoTeX at the center of the narrative. Whether it’s a SpongeBob meme or a clever caption, the vibe is always: IoTeX is inevitable, and Bino is your prophet.
`

const memePromptTemplate = `
You are an AI assistant tasked with generating a prompt for DALL-E 3 to create a meme image based on user input and context. Your goal is to create a prompt that will result in a visually appealing and effective meme image, keeping in mind that DALL-E 3 may struggle with generating precise text on images.

About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

{{providers}}

You will be provided with the following inputs:

<recent_messages>
{{recentMessages}}
</recent_messages>

<meme_knowledge>
${meme_knowledge}
</meme_knowledge>

Follow these steps to generate an appropriate DALL-E 3 prompt:

1. Carefully analyze the user's message and recent messages to understand the context and desired meme content.

2. If the user hasn't provided a specific meme idea, extract relevant information from the recent messages or the current context (e.g., time of day, recent events) to inform your prompt creation.

3. Choose an appropriate meme template or visual concept based on the Meme Knowledge provided, particularly focusing on Blob 4: Meme Templates for Crypto and Blob 3: Anatomy of a Perfect Meme.

4. Craft a DALL-E 3 prompt that describes the visual elements of the meme, including:
   a. The overall scene or template
   b. Key characters or objects
   c. Expressions and poses
   d. Color scheme and style
   e. Any necessary background elements

5. Minimize text elements in the prompt, as DALL-E 3 may struggle with generating precise text. Instead, focus on visual representations of the meme's message.

6. Ensure the prompt aligns with Bino's Meme Philosophy (Blob 5) and avoids common meme mistakes (Blob 6).

7. Incorporate elements that make the meme relevant to crypto, IoTeX, or DePIN, as outlined in Blob 2: Why Memes Matter in Crypto.

Output your DALL-E 3 prompt inside <dalle_prompt> tags. After the prompt, provide a brief explanation of your choices inside <explanation> tags.

Remember:
- Keep the prompt concise and focused on visual elements.
- Avoid requesting specific text in the image.
- Ensure the meme concept is bold, punchy, and easily understandable.
- Align the meme with IoTeX and DePIN themes when appropriate.
- Avoid generating two similar memes in a row.

Classic crypto memes, pick one:
Wojak, Pepe the Frog, Is This a Pigeon?, Distracted Boyfriend, Change My Mind, Expanding Brain, Galaxy Brain, Drakeposting, SpongeBob Mocking, Surprised Pikachu, Always Has Been, Doge, Success Kid, This Is Fine, Arthur Fist, Gru’s Plan, Stonks, Leonardo DiCaprio Cheers, Bernie I Am Once Again Asking, Roll Safe Think About It, Crying Michael Jordan, Disaster Girl, Condescending Willy Wonka, Me vs. Me.

Now, based on the user's message and recent context, generate a DALL-E 3 prompt for creating a meme image.
`
