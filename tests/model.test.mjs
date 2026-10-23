import { test } from "node:test";
import assert from "node:assert/strict";
import { normalise, BowerError, statusSummary, transitionLabel } from "../lib/model.mjs";

const base = () => ({
  schema: "bowerbird/v1",
  meta: { title: "t" },
  categories: { sage: {} },
  nodes: [
    { id: "a", title: "A", at: [0, 0], category: "sage" },
    { id: "b", title: "B", at: [1, 0] },
  ],
  edges: [{ from: "a", to: "b" }],
});

test("normalises a valid diagram with defaults", () => {
  const m = normalise(base());
  assert.equal(m.edges[0].kind, "data");
  assert.deepEqual(m.nodes[0].span, [1, 1]);
  assert.equal(m.meta.grid.col, 300);
});

test("collects every problem with a stable code", () => {
  const d = base();
  d.nodes.push({ id: "a", title: "dup", at: [0, 0] });
  d.edges.push({ from: "a", to: "ghost" });
  d.nodes[1].status = "done";
  let problems = [];
  assert.throws(() => { try { normalise(d); } catch (e) { problems = e.problems; throw e; } }, BowerError);
  const codes = new Set(problems.map((p) => p.code));
  for (const code of ["node-dup", "overlap", "edge-to", "status"]) assert.ok(codes.has(code), `missing ${code}`);
});

test("pseudo-states need no title; cards do", () => {
  const d = base();
  d.nodes.push({ id: "s", shape: "initial", at: [2, 0] });
  assert.doesNotThrow(() => normalise(d));
  d.nodes.push({ id: "x", at: [3, 0] });
  assert.throws(() => normalise(d), /node-title/);
});

test("transition label composes event [guard] / action", () => {
  assert.equal(transitionLabel({ event: "submit", guard: "valid", action: "save" }), "submit [valid] / save");
  assert.equal(transitionLabel({ label: "explicit", event: "x" }), "explicit");
  assert.equal(transitionLabel({}), undefined);
});

test("status summary counts missing status as planned when tracking", () => {
  const d = base();
  d.meta.statusTracking = true;
  d.nodes[0].status = "implemented";
  assert.deepEqual(statusSummary(normalise(d)), { implemented: 1, partial: 0, planned: 1, untracked: 0 });
});
