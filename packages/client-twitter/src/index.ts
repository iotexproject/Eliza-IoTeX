import { Client, elizaLogger, IAgentRuntime } from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { validateTwitterConfig, TwitterConfig } from "./environment.ts";
import { TwitterInteractionClient } from "./interactions.ts";
import { TwitterPostClient } from "./post.ts";
import { TwitterSearchClient } from "./search.ts";
import { TwitterActionProcessor } from "./actions.ts";

class TwitterManager {
    client: ClientBase;
    post: TwitterPostClient;
    search: TwitterSearchClient;
    interaction: TwitterInteractionClient;
    actions: TwitterActionProcessor;

    constructor(runtime: IAgentRuntime, twitterConfig: TwitterConfig) {
        this.client = new ClientBase(runtime, twitterConfig);

        this.post = new TwitterPostClient(this.client, runtime);
        this.actions = new TwitterActionProcessor(this.client, runtime);
        if (twitterConfig.TWITTER_SEARCH_ENABLE) {
            this.search = new TwitterSearchClient(this.client, runtime);
        }
        this.interaction = new TwitterInteractionClient(this.client, runtime);
    }
}

export const TwitterClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        const twitterConfig: TwitterConfig =
            await validateTwitterConfig(runtime);

        elizaLogger.log("Twitter client started");

        const manager = new TwitterManager(runtime, twitterConfig);

        await manager.client.init();
        await manager.post.start();
        if (manager.search) {
            await manager.search.start();
        }
        await manager.interaction.start();

        return manager;
    },

    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("Twitter client does not support stopping yet");
    },
};

export default TwitterClientInterface;
