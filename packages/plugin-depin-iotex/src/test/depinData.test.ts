import { describe, expect, it, vi } from "vitest";

import {
    DEPIN_METRICS_URL,
    DEPIN_PROJECTS_URL,
    DepinDataProvider,
} from "../providers/depinData";
import { mockDepinscanMetrics, mockDepinscanProjects } from "./mockData";

vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
        if (url.includes(DEPIN_METRICS_URL)) {
            return Promise.resolve({
                json: () => Promise.resolve(mockDepinscanMetrics),
            });
        } else if (url.includes(DEPIN_PROJECTS_URL)) {
            return Promise.resolve({
                json: () => Promise.resolve(mockDepinscanProjects),
            });
        } else {
            return Promise.reject(new Error("Unknown endpoint"));
        }
    })
);

describe("Depin Data provider", () => {
    it("should init", () => {
        const ddp = new DepinDataProvider();

        expect(ddp).toBeDefined();
    });
    it("should fetch depinscan metrics", async () => {
        const metrics = await DepinDataProvider.fetchDepinscanMetrics();

        expect(metrics).toEqual(mockDepinscanMetrics);
    });
    it("should fetch depinscan projects", async () => {
        const projects = await DepinDataProvider.fetchDepinscanProjects();

        expect(projects).toEqual(mockDepinscanProjects);
    });
});
