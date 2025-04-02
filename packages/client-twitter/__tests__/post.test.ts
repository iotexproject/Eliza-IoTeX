import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    IAgentRuntime,
    elizaLogger,
    generateMessageResponse,
    Content,
} from "@elizaos/core";

import { TwitterPostClient } from "../src/post";
import { ClientBase } from "../src/base";
import { TwitterConfig } from "../src/environment";
import {
    buildTwitterClientMock,
    buildConfigMock,
    buildRuntimeMock,
    createSuccessfulTweetResponse,
    mockTwitterProfile,
    mockCharacter,
} from "./mocks";

// Mock modules at the top level
vi.mock("@elizaos/core", async () => {
    const actual = await vi.importActual("@elizaos/core");
    return {
        ...actual,
        elizaLogger: {
            log: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
        },
        generateText: vi.fn(),
        composeContext: vi.fn().mockReturnValue("mocked context"),
        generateMessageResponse: vi.fn(),
    };
});

vi.mock("../src/utils", async () => {
    const actual = await vi.importActual("../src/utils");
    return {
        ...actual,
        buildConversationThread: vi.fn(),
    };
});

describe("Twitter Post Client", () => {
    let mockRuntime: IAgentRuntime;
    let mockConfig: TwitterConfig;
    let baseClient: ClientBase;
    let mockTwitterClient: any;
    let postClient: TwitterPostClient;

    beforeEach(() => {
        vi.clearAllMocks();

        mockTwitterClient = buildTwitterClientMock();
        mockRuntime = buildRuntimeMock();
        mockConfig = buildConfigMock();
        baseClient = new ClientBase(mockRuntime, mockConfig);

        baseClient.twitterClient = mockTwitterClient;
        baseClient.profile = mockTwitterProfile;

        // Mock RequestQueue with just the add method since that's all we use
        baseClient.requestQueue = {
            add: async <T>(request: () => Promise<T>): Promise<T> => request(),
        } as any;

        // Setup mock runtime with character
        mockRuntime.character = mockCharacter;

        // Ensure baseClient.profile is not null before each test
        baseClient.profile = mockTwitterProfile;

        postClient = new TwitterPostClient(baseClient, mockRuntime);
    });

    it("should create post client instance", () => {
        const postClient = new TwitterPostClient(baseClient, mockRuntime);
        expect(postClient).toBeDefined();
        expect(postClient.twitterUsername).toBe("testuser");
    });

    describe("Generate New Tweet", () => {
        it("should generate and post a new tweet successfully", async () => {
            if (!baseClient.profile) {
                throw new Error("Profile must be defined for test");
            }

            vi.mocked(generateMessageResponse).mockResolvedValue({
                text: "Test tweet content",
            } as Content);

            mockTwitterClient.sendTweet.mockResolvedValue(
                createSuccessfulTweetResponse("Test tweet content")
            );

            await postClient["generateNewTweet"]();

            expect(mockRuntime.ensureUserExists).toHaveBeenCalledWith(
                mockRuntime.agentId,
                baseClient.profile.username,
                mockRuntime.character.name,
                "twitter"
            );

            expect(mockRuntime.composeState).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockRuntime.agentId,
                    content: {
                        text: "topic1, topic2",
                        action: "TWEET",
                    },
                }),
                expect.objectContaining({
                    twitterUserName: baseClient.profile.username,
                    maxTweetLength: baseClient.twitterConfig.MAX_TWEET_LENGTH,
                })
            );

            expect(elizaLogger.log).toHaveBeenNthCalledWith(
                7,
                expect.stringContaining("Posting new tweet")
            );
        });

        it("should handle tweet generation error", async () => {
            vi.mocked(generateMessageResponse).mockRejectedValue(
                new Error("Generation failed")
            );

            await postClient["generateNewTweet"]();

            expect(elizaLogger.error).toHaveBeenCalledWith(
                "Error generating new tweet:",
                expect.any(Error)
            );

            expect(mockTwitterClient.sendTweet).not.toHaveBeenCalled();
        });
    });
});
