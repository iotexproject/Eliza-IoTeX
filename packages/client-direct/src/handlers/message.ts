import express from "express";

import { stringToUuid, Content, Memory, elizaLogger } from "@elizaos/core";

import { DirectClient } from "../client";
import { genRoomId, genUserId, genResponse, composeContent } from "./helpers";

export async function handleMessage(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
        await handle(req, res, directClient);
    } catch (error) {
        res.write(
            `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
        );
        res.end();
    }
}

async function handle(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    const roomId = genRoomId(req);
    const userId = genUserId(req);
    const runtime = directClient.getRuntime(req.params.agentId);
    const agentId = runtime.agentId;

    await runtime.ensureConnection(
        userId,
        roomId,
        req.body.userName,
        req.body.name,
        "direct"
    );

    const content = await composeContent(req, runtime);
    const userMessage = {
        content,
        userId,
        roomId,
        agentId,
    };

    const messageId = stringToUuid(Date.now().toString());
    const memory: Memory = {
        id: stringToUuid(messageId + "-" + userId),
        ...userMessage,
        createdAt: Date.now(),
    };

    await runtime.messageManager.createMemory({
        memory,
        isUnique: true,
    });

    let state = await runtime.composeState(userMessage, {
        agentName: runtime.character.name,
    });

    const { response, context } = await genResponse(runtime, state);

    // Send initial response immediately
    const responseData = {
        id: messageId,
        ...response,
    };
    res.write(`data: ${JSON.stringify(responseData)}\n\n`);

    const responseMessage: Memory = {
        id: stringToUuid(messageId + "-" + agentId),
        ...userMessage,
        userId: agentId,
        content: response,
        createdAt: Date.now(),
    };

    elizaLogger.log("DIRECT_MESSAGE_RESPONSE_RES", {
        body: { userMessage, context, responseMessage },
        userId,
        roomId,
        type: "response",
    });

    await runtime.messageManager.createMemory({
        memory: responseMessage,
        isUnique: true,
    });
    state = await runtime.updateRecentMessageState(state);

    // Process actions and stream any additional messages
    await runtime.processActions(
        memory,
        [responseMessage],
        state,
        async (content: Content) => {
            if (content) {
                const messageData = {
                    id: stringToUuid(Date.now().toString() + "-" + userId),
                    ...content,
                };
                const stringifiedMessageData = JSON.stringify(messageData);
                elizaLogger.info(stringifiedMessageData);
                res.write(`data: ${stringifiedMessageData}\n\n`);
            }
            return [memory];
        }
    );

    // Run evaluators last
    await runtime.evaluate(memory, state);

    // End the stream
    res.write("event: end\ndata: stream completed\n\n");
    res.end();
}
