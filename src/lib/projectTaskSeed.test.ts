import { describe, expect, it } from "vitest";
import {
  mergeDefaultTaskTitles,
  partitionTitlesForSeed,
  serviceIdsFromLineItems,
  uniqueServiceIds,
} from "./projectTaskSeed";

describe("projectTaskSeed", () => {
  it("deduplicates service IDs in order", () => {
    expect(uniqueServiceIds(["a", "b", "a", "", null, "b"])).toEqual(["a", "b"]);
  });

  it("collects service IDs from line items", () => {
    expect(
      serviceIdsFromLineItems([
        { service_id: "s1" },
        { service_id: null },
        { service_id: "s2" },
        { service_id: "s1" },
      ]),
    ).toEqual(["s1", "s2"]);
  });

  it("merges default tasks in service order without duplicate titles", () => {
    const titles = mergeDefaultTaskTitles(
      ["svc-a", "svc-b"],
      [
        { id: "svc-a", default_tasks: ["Kickoff", "Research"] },
        { id: "svc-b", default_tasks: ["research", "Delivery"] },
      ],
    );
    expect(titles).toEqual(["Kickoff", "Research", "Delivery"]);
  });

  it("skips titles that already exist on the project", () => {
    const { toCreate, skipped } = partitionTitlesForSeed(
      ["Kickoff", "Research", "Delivery"],
      ["research", "Other"],
    );
    expect(toCreate).toEqual(["Kickoff", "Delivery"]);
    expect(skipped).toBe(1);
  });
});
