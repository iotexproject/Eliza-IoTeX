import {
    State,
    IAgentRuntime,
    composeContext,
    ModelClass,
    elizaLogger,
    Content,
    generateMessageResponse,
} from "@elizaos/core";
import { http, createWalletClient, walletActions } from "viem";
import { iotex } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";

import { quicksilverResponseTemplate } from "../template";

type QuicksilverTool =
    | "weather-current"
    | "weather-forecast"
    | "news"
    | "depin-metrics"
    | "depin-projects"
    | "l1data"
    | "nuclear"
    | "mapbox";

type NewsToolParams = {
    category:
        | "business"
        | "entertainment"
        | "general"
        | "health"
        | "science"
        | "sports"
        | "technology";
    q: string;
};

type ToolParams = {
    "weather-current": { lat: number; lon: number };
    "weather-forecast": { lat: number; lon: number };
    news: NewsToolParams;
    "depin-metrics": { isLatest?: boolean };
    "depin-projects": Record<string, never>;
    l1data: Record<string, never>;
    nuclear: { start: string; end: string }; // Format: YYYY-MM-DD
    mapbox: { location: string };
};

const AGENT_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const account = privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`);
const transport = http(iotex.rpcUrls.default.http[0]);
const walletClient = createWalletClient({
    chain: iotex,
    transport,
    account,
}).extend(walletActions);

export async function askQuickSilver(content: string): Promise<string> {
    const url = process.env.QUICKSILVER_URL || "https://quicksilver.iotex.ai";
    const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);

    try {
        const response = await fetchWithPayment(`${url}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: content,
            }),
        });

        const responseData = await response.json();

        if (responseData.data) {
            return responseData.data;
        } else {
            throw new Error("Failed to get response from Quicksilver");
        }
    } catch (error) {
        throw new Error(`Quicksilver request failed: ${error.message}`);
    }
}

export async function getRawDataFromQuicksilver<T extends QuicksilverTool>(
    tool: T,
    params?: ToolParams[T]
): Promise<any> {
    const url = process.env.QUICKSILVER_URL || "https://quicksilver.iotex.ai";
    const queryParams = new URLSearchParams({ tool });

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            queryParams.append(key, String(value));
        });
    }

    try {
        const response = await fetch(`${url}/raw?${queryParams.toString()}`);
        const responseData = await response.json();

        if (responseData?.data) {
            return responseData.data;
        } else {
            throw new Error(`Failed to fetch raw data for tool: ${tool}`);
        }
    } catch (error) {
        throw new Error(
            `Failed to fetch raw data for tool ${tool}: ${error.message}`
        );
    }
}

export async function adaptQSResponse(
    state: State,
    runtime: IAgentRuntime,
    qsResponse: string
): Promise<Content> {
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
    const response = await generateMessageResponse({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    elizaLogger.info(response);

    return response;
}
