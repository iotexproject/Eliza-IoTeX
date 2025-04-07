import express from "express";
import { getEnvVariable } from "@elizaos/core";

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

export function createApiRouter(directClient: DirectClient) {
    const router = express.Router();
    const upload = directClient.upload;

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
        upload.single("file"),
        async (req: express.Request, res: express.Response) => {
            await messageStream.handleMessageStream(req, res, directClient);
        }
    );
    return router;
}
