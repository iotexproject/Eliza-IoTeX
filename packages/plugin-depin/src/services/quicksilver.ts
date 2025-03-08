import {
    State,
    IAgentRuntime,
    composeContext,
    generateText,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";
import axios from "axios";

import { quicksilverResponseTemplate } from "../template";
import { parseTagContent } from "../helpers/parsers";

export async function askQuickSilver(content: string): Promise<string> {
    const url = process.env.QUICKSILVER_URL || "https://quicksilver.iotex.ai";
    const response = await axios.post(url + "/ask", {
        q: content,
    });

    if (response.data.data) {
        return response.data.data;
    } else {
        throw new Error("Failed to fetch weather data");
    }
}

export async function adaptQSResponse(
    state: State,
    runtime: IAgentRuntime,
    qsResponse: string
) {
    state.qsResponse = qsResponse;
    const context = composeContext({
        state: {
            ...state,
            recentMessages: state.recentMessages
                .split("\n")
                .slice(-10)
                .join("\n"),
        },
        template:
            // @ts-expect-error: quicksilverResponseTemplate should be added to character type
            runtime.character.templates?.quicksilverResponseTemplate ||
            quicksilverResponseTemplate,
    });
    elizaLogger.info(context);
    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    elizaLogger.info(response);

    return parseTagContent(response, "response");
}
