import { Action, composeContext, generateMessageResponse, generateText, HandlerCallback, IAgentRuntime, Memory, ModelClass, State } from "@elizaos/core";

export const depinProjects: Action = {
    name: "DEPIN_PROJECTS",
    similes: ["DEPIN_TOKENS"],
    description: "Fetches and compares DePIN project token prices",
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "What is the token price of Render?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The current token price of Render (RNDR) is $9.02.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Which token has a higher price: Helium or Render?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Helium (HNT) is priced at $3.21, which is lower than Render (RNDR) at $9.02.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Can you give me the prices of all available tokens?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Sure! Solana (SOL) is $221.91, Render (RNDR) is $9.02, and Helium (HNT) is $3.21.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Which token costs more than $200?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The only token priced above $200 is Solana (SOL) at $221.91.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What is the market cap of Render?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The market cap of Render (RNDR) is $4,659,773,671.85.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Can you give me the categories for Solana?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Solana (SOL) belongs to the following categories: Chain.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What is the fully diluted valuation of Helium?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The fully diluted valuation of Helium (HNT) is $450,000,000.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What are the projects running on Solana?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The projects running on Solana include Render and Helium.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What is the token price of an unlisted project?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'm sorry, but I don't have information on the token price for the specified project.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What is the launch date of Solana?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'm sorry, but I don't have information on the launch date of Solana.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Can you tell me the founder of Render?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I currently don't have information on the founder of Render.",
                    action: "DEPIN_TOKENS",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Do you have the total supply for Helium?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'm sorry, but I don't have data on the total supply of Helium.",
                    action: "DEPIN_TOKENS",
                },
            },
        ]
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const projectsContext = composeContext({
            state,
            template: projectsTemplate
        })

        try {
            const text = await generateText({
                runtime,
                context: projectsContext,
                modelClass: ModelClass.LARGE,
            })

            if (callback) {
                callback({
                    text,
                    inReplyTo: message.id
                })
            }

            return true;
        } catch (error) {
            console.error("Error in depin project plugin:", error);
            if (callback) {
                callback({
                    text: `Error processing request, try again`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    }
}

const projectsTemplate = `
You are an AI assistant with access to data about various blockchain and DePIN (Decentralized Physical Infrastructure Network) projects. Your primary task is to answer user questions about token prices and other project-related information accurately and precisely. Here's the data you have access to:
About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

{{providers}}

When a user asks a question, follow these steps:

1. Analyze the user's question carefully.
2. Search the provided projects data for relevant information.
3. If the question is about token prices, provide the most up-to-date price information available in the data.
4. If the question is about other project details (e.g., market cap, description, categories), provide that information accurately.
5. If the question cannot be answered using the available data, politely inform the user that you don't have that information.

When responding to the user:
1. Provide a clear and concise answer to the user's question.
2. If you're stating a token price or numerical value, include the exact figure from the data.
3. If relevant, provide brief additional context or information that might be helpful.

Remember to be precise, especially when discussing token prices or other numerical data. Do not speculate or provide information that is not present in the given data.

Now, please answer the user question, based on some recent messages:

{{recentMessages}}
`