import type { Plugin } from "@ai16z/eliza";

import { depinDataProvider } from "./providers/depinData";

export const depinPlugin: Plugin = {
    name: "depin",
    description: "DePIN plugin",
    providers: [depinDataProvider],
    evaluators: [],
    services: [],
    actions: [],
};

export default depinPlugin;
