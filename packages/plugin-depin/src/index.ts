import type { Plugin } from "@ai16z/eliza";

import { depinDataProvider } from "./providers/depinData";
import { fetchDepinscanDataAction } from "./actions/fetchDepinscanData";

export const depinPlugin: Plugin = {
    name: "depin",
    description: "DePIN plugin",
    providers: [depinDataProvider],
    evaluators: [],
    services: [],
    actions: [fetchDepinscanDataAction],
};

export default depinPlugin;
