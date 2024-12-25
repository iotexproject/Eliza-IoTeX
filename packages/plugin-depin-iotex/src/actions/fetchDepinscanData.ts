import {
    elizaLogger,
    generateText,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { DepinDataProvider } from "../providers/depinData";
import { DepinScanMetrics, DepinScanProject } from "../types/depin";

export const fetchDepinscanDataAction = {
    name: "DEPINSCAN_DATA",
    description: "Fetches metrics and projects data from DePINScan",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Fetch DePINScan action handler called");

        try {
            const metrics = await DepinDataProvider.fetchDepinscanMetrics();
            const projects = await DepinDataProvider.fetchDepinscanProjects();

            const response = await generateText({
                runtime,
                context: depinAnalysisTemplate(state, metrics, projects),
                modelClass: ModelClass.LARGE,
            });

            if (callback) {
                callback({
                    text: response,
                    content: {
                        success: true,
                        metrics,
                        projects: JSON.stringify(projects, (key, value) =>
                            typeof value === "bigint" ? value.toString() : value
                          ),
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during DePINScan data fetching:", error);
            if (callback) {
                callback({
                    text: `Error fetching DePINScan data: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Which DePIN project has the highest market cap?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The DePIN project with the highest market cap is Solana, with a market cap of $106,247,097,756.01.",
                    action: "DEPINSCAN_DATA",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Show me all projects running on Solana.",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The following projects are running on Solana: Solana and Render.",
                    action: "DEPINSCAN_DATA",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What are the categories of the Render project?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The Render project belongs to the following categories: Server, AI.",
                    action: "DEPINSCAN_DATA",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Compare the token prices of Solana and Render.",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Solana (SOL) is priced at $221.91, while Render (RNDR) is priced at $9.02.",
                    action: "DEPINSCAN_DATA",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What is the network status of all listed projects?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Both Solana and Render are currently on the Mainnet.",
                    action: "DEPINSCAN_DATA",
                },
            },
        ],
    ],
    similes: [
        "ANALYZE_PROJECTS",
        "FILTER_PROJECTS",
        "GET_PROJECT_CATEGORIES",
        "COMPARE_TOKEN_PRICES",
        "GET_NETWORK_STATUS",
    ],
};

const depinAnalysisTemplate = (
    state: State,
    metrics: DepinScanMetrics,
    projects: DepinScanProject
) =>
    `
### 📊 DePIN Analysis Request

#### 🗂️ **State Information**
\`\`\`
${state}
\`\`\`

#### 📈 **Metrics Data**
\`\`\`
${metrics}
\`\`\`

#### 🏗️ **Projects Data**
\`\`\`
${JSON.stringify(projects, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  )}
\`\`\`

---

### 📝 **Instructions for the Agent**

Based on the state information, metrics, and project data provided above, perform the analysis requested by the user.

While focusing on the user's specific request, you may optionally include the following types of analysis if relevant:

1. **Top Projects by Market Cap**:
   - Identify the projects with the highest market capitalization and list them in descending order.

2. **Token Price Insights**:
   - Compare the token prices of different projects and highlight any significant differences.

3. **Network Status Overview**:
   - Group the projects based on their network status (e.g., Mainnet, Testnet).

4. **Layer 1 Distribution**:
   - Analyze how many projects are deployed on each Layer 1 blockchain.

5. **Categories Breakdown**:
   - List the different categories each project belongs to and summarize the focus areas.

6. **Key Insights**:
   - Provide high-level observations based on the data, such as trends, notable outliers, or potential opportunities.

---

### 🎯 **Agent’s Objective**

Prioritize delivering the analysis requested by the user. Include additional insights or analysis types from the list above **only if they support or enhance the user’s request**.
`;
