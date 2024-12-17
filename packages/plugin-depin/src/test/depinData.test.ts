import { describe, expect, it, vi } from "vitest";

import { DepinDataProvider } from "../providers/depinData";

const METRICS_OBJECT = [
    {
        date: "2024-12-17",
        total_projects: "291",
        market_cap: "36046044620.57570635160",
        total_device: "19416950",
    },
];

vi.stubGlobal(
    "fetch",
    vi.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve(METRICS_OBJECT),
        })
    )
);

describe("Depin Data provider", () => {
    it("should init", () => {
        const ddp = new DepinDataProvider();

        expect(ddp).toBeDefined();
    });
    it("should fetch depin metrics", async () => {
        const metrics = await DepinDataProvider.fetchDepinscanMetrics();

        expect(metrics).toEqual(METRICS_OBJECT);
    });
});
