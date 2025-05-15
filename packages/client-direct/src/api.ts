import express from "express";
import { getEnvVariable } from "@elizaos/core";
import { paymentMiddleware, Network } from "x402-express";

import { DirectClient } from ".";
import { CustomRequest } from "./types";
import {
    getRequests,
    image,
    message,
    speak,
    whisper,
    messageStream,
} from "./handlers";
import {
    messageRateLimiter,
    streamRateLimiter,
    globalRateLimiter,
} from "./rate-limiter";

const X402_PAYMENT_RECEIVER =
    (process.env.X402_PAYMENT_RECEIVER as `0x${string}`) ||
    ("" as `0x${string}`);
const X402_PRICE_FOR_PROTECTED_ROUTE_USDC =
    process.env.X402_PRICE_FOR_PROTECTED_ROUTE_USDC || "$0.1";
const X402_NETWORK =
    (process.env.X402_NETWORK as Network) || ("iotex" as Network);
const X402_FACILITATOR_URL =
    process.env.X402_FACILITATOR_URL || "http://localhost:8001/facilitator";

const routePaymentConfig = {
    price: X402_PRICE_FOR_PROTECTED_ROUTE_USDC,
    network: X402_NETWORK,
    config: {
        description: "Access to BinoAPI",
    },
};

export function createApiRouter(directClient: DirectClient) {
    const router = express.Router();
    const upload = directClient.upload;

    // Apply global rate limiting to all routes
    router.use(globalRateLimiter);
    router.use(
        paymentMiddleware(
            X402_PAYMENT_RECEIVER,
            {
                "POST /:agentId/message": routePaymentConfig,
                "POST /:agentId/message-stream": routePaymentConfig,
            },
            {
                url: X402_FACILITATOR_URL as `${string}://${string}`,
            }
        )
    );

    router.use(
        express.json({
            limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
        })
    );

    router.get("/", (_, res) => {
        getRequests.handleRoot(res);
    });

    router.get("/hello", (_, res) => {
        getRequests.handleHello(res);
    });

    router.get("/agents", (_, res) => {
        getRequests.handleAgents(res, directClient);
    });

    router.get(
        "/agents/:agentId/channels",
        async (req: express.Request, res: express.Response) => {
            getRequests.handleChannels(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/message",
        messageRateLimiter,
        upload.single("file"),
        async (req: express.Request, res: express.Response) => {
            await message.handleMessage(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/whisper",
        upload.single("file"),
        async (req: CustomRequest, res: express.Response) => {
            await whisper.handleWhisper(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/image",
        async (req: express.Request, res: express.Response) => {
            await image.handleImage(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/speak",
        async (req: express.Request, res: express.Response) => {
            await speak.handleSpeak(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/message-stream",
        streamRateLimiter,
        upload.single("file"),
        async (req: express.Request, res: express.Response) => {
            await messageStream.handleMessageStream(req, res, directClient);
        }
    );
    return router;
}
