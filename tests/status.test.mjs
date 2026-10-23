import { test } from "node:test";
import assert from "node:assert/strict";
import { pathPresent, deriveNodeStatus } from "../lib/status.mjs";

const files = new Set(["lib/a.mjs", "lib/b.mjs", "tests/a.test.mjs", "docs/x/y.md"]);

// merged = on the default branch; tracked = the working copy (any branch).
const facts = ({ merged = [], tracked = [] } = {}) => ({ merged: new Set(merged), tracked: new Set(tracked), staged: new Set() });

test("pathPresent handles exact, directory, and * patterns", () => {
  assert.ok(pathPresent("lib/a.mjs", files));
  assert.ok(pathPresent("./lib/a.mjs", files));
  assert.ok(pathPresent("docs/", files));
  assert.ok(pathPresent("lib/*.mjs", files));
  assert.ok(!pathPresent("lib/*/x.mjs", files));
  assert.ok(!pathPresent("src/", files));
});

test("nodes without evidence, or pinned, are left alone", () => {
  assert.equal(deriveNodeStatus({ id: "n" }, facts()), null);
  assert.equal(deriveNodeStatus({ evidence: { paths: ["lib/a.mjs"], status: "pinned" } }, facts({ merged: ["lib/a.mjs"] })), null);
});

test("tested and merged -> implemented", () => {
  const f = facts({ merged: ["lib/a.mjs", "tests/a.test.mjs"] });
  assert.equal(deriveNodeStatus({ evidence: { paths: ["lib/a.mjs"], tests: ["tests/a.test.mjs"] } }, f), "implemented");
});

test("merged but no tests declared -> partial, never built", () => {
  assert.equal(deriveNodeStatus({ evidence: { paths: ["lib/a.mjs"] } }, facts({ merged: ["lib/a.mjs"] })), "partial");
});

test("tested on a feature branch but not merged -> partial", () => {
  const f = facts({ tracked: ["lib/a.mjs", "tests/a.test.mjs"] });
  assert.equal(deriveNodeStatus({ evidence: { paths: ["lib/a.mjs"], tests: ["tests/a.test.mjs"] } }, f), "partial");
});

test("code merged, declared test still missing on main -> partial", () => {
  const f = facts({ merged: ["lib/b.mjs"], tracked: ["lib/b.mjs", "tests/b.test.mjs"] });
  assert.equal(deriveNodeStatus({ evidence: { paths: ["lib/b.mjs"], tests: ["tests/b.test.mjs"] } }, f), "partial");
});

test("nothing anywhere -> planned", () => {
  assert.equal(deriveNodeStatus({ evidence: { paths: ["lib/missing.mjs"], tests: ["tests/missing.test.mjs"] } }, facts()), "planned");
});
