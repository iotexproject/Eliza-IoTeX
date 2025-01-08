import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
} from "@elizaos/core";

import { askQuickSilver } from "../services/quicksilver";
import { extractLocationQuestion } from "../services/map"

export const currentWeather: Action = {
    name: "CURRENT_WEATHER",
    similes: [
        "WEATHER",
        "WEATHER_REPORT",
        "WEATHER_UPDATE",
    ],
    description: "Get the current weather for a given location",
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "What is the weather in Tokyo?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The current weather in Tokyo is 20°C with clear skies.",
                    action: "CURRENT_WEATHER",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "How's the weather looking in New York right now?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "In New York City, it's currently 15°C (feels like 13°C) with 65% humidity. Wind speed is 12 km/h and conditions are partly cloudy with a UV index of 3.",
                    action: "CURRENT_WEATHER",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Tell me about the weather in London",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "London is experiencing light rain with a temperature of 12°C (feels like 10°C). The pressure is 1015 hPa with 78% humidity and wind speeds of 15 km/h.",
                    action: "CURRENT_WEATHER",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What are the current conditions in Dubai?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Dubai is hot at 35°C (feels like 38°C) with clear skies. Humidity is at 45%, UV index is 8, and there's a light breeze at 8 km/h.",
                    action: "CURRENT_WEATHER",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What's the temperature range today in Moscow?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "In Moscow, the current temperature is -5°C with a range of -8°C to -3°C today. Light snowfall conditions with 85% humidity and wind speed at 20 km/h.",
                    action: "CURRENT_WEATHER",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What's the detailed weather report for Sydney?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Sydney's current temperature is 26°C (feels like 28°C), ranging from 22°C to 29°C. Clear sky conditions with 60% humidity, UV index of 9, and coastal winds at 15 km/h.",
                    action: "CURRENT_WEATHER",
                },
            },
        ],
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

        try {
            const location = await extractLocationQuestion(
                state,
                runtime
            );
            if (!location) {
                if (callback) {
                    callback({
                        text: `Location is not available for the given location, please try again`,
                        content: { error: "No valid location found" },
                    });
                }
                return false;
            }

            const weather = await askQuickSilver(location);
            if (callback) {
                callback({
                    text: weather,
                    inReplyTo: message.id,
                });
            }

            return true;
        } catch (error) {
            console.error("Error in current weather plugin:", error);
            if (callback) {
                callback({
                    text: `Error processing request, try again`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
};

