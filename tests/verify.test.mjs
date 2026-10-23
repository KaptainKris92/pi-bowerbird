import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalise } from "../lib/model.mjs";
import { analyse, journeys, toTla } from "../lib/verify.mjs";
import { diffModels } from "../lib/diff.mjs";

const FILE = new URL("../examples/proposal-to-merge.bower.json", import.meta.url);
const lifecycle = () => normalise(JSON.parse(readFileSync(FILE, "utf8")));

test("check finds the two seeded statechart faults", () => {
  const found = analyse(lifecycle()).map((f) => `${f.code}:${f.node}`).sort();
  assert.deepEqual(found, ["ambiguous:blocked", "dead-end:lease"]);
});

test("a fixed statechart has no findings", () => {
  const raw = JSON.parse(readFileSync(FILE, "utf8"));
  raw.edges.find((e) => e.from === "blocked" && e.to === "dropped").guard = "grant refused";
  raw.edges.push({ from: "lease", to: "dispatched", event: "lease", guard: "worker free" }, { from: "lease", to: "dropped", event: "expire" });
  assert.deepEqual(analyse(normalise(raw)), []);
});

test("journeys start at the initial target and end at a final or dead end", () => {
  const js = journeys(lifecycle());
  assert.ok(js.length >= 3);
  assert.match(js[0], /^Journey 1: Proposed -> /);
  assert.match(js[0], /Given the chart is in "Proposed"/);
  assert.ok(js.some((j) => j.includes('"Awaiting lease"')));
});

test("TLA+ output declares every state and one action per transition", () => {
  const model = lifecycle();
  const { tla, cfg } = toTla(model, "ProposalToMerge");
  assert.match(tla, /MODULE ProposalToMerge/);
  for (const n of model.nodes.filter((x) => x.shape !== "initial")) assert.ok(tla.includes(`"${n.id}"`), n.id);
  assert.equal((tla.match(/^T\d+_/gm) ?? []).length, model.edges.length - 1);
  assert.match(cfg, /CHECK_DEADLOCK TRUE/);
});

test("diff reports added, removed, and status changes", () => {
  const before = normalise({ schema: "bowerbird/v1", meta: { title: "t" }, nodes: [{ id: "a", title: "A", at: [0, 0] }, { id: "b", title: "B", at: [1, 0] }], edges: [{ from: "a", to: "b" }] });
  const after = normalise({ schema: "bowerbird/v1", meta: { title: "t" }, nodes: [{ id: "a", title: "A", at: [0, 0], status: "implemented" }, { id: "c", title: "C", at: [1, 0] }], edges: [{ from: "a", to: "c" }] });
  const types = diffModels(before, after).map((c) => c.type).sort();
  assert.deepEqual(types, ["edge-added", "edge-removed", "node-added", "node-removed", "status"]);
});
