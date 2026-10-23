import { SCHEMA } from "./model.mjs";

export function starter(title) {
  return {
    schema: SCHEMA,
    meta: { title, subtitle: "One sentence on what this map shows.", statusTracking: true, animation: "trace" },
    categories: { sage: { label: "Entry" }, slate: { label: "Core" }, mauve: { label: "Storage" } },
    zones: [
      { id: "edge", title: "Entry", kicker: "01 / input", category: "sage" },
      { id: "core", title: "Core", kicker: "02 / logic", category: "slate" },
    ],
    traces: [{ id: "request", label: "A request" }],
    nodes: [
      { id: "cli", zone: "edge", at: [0, 0], type: "cli", title: "Command line", lines: ["parses flags"], category: "sage", traces: ["request"],
        evidence: { paths: ["bin/"] }, details: "Entry point.\n\n#### Code\n- [bin/](bin/)" },
      { id: "engine", zone: "core", at: [1, 0], type: "module", title: "Engine", lines: ["does the work"], category: "slate", traces: ["request"],
        evidence: { paths: ["lib/engine.mjs"], tests: ["tests/engine.test.mjs"] } },
      { id: "store", zone: "core", at: [1, 1], type: "storage", title: "Store", lines: ["persists results"], category: "mauve",
        evidence: { paths: ["lib/store.mjs"] } },
    ],
    edges: [
      { from: "cli", to: "engine", label: "options", traces: ["request"] },
      { from: "engine", to: "store", kind: "data", label: "writes" },
    ],
  };
}
