import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalise } from "../lib/model.mjs";
import { layout, simplify } from "../lib/layout.mjs";

const load = (name) => normalise(JSON.parse(readFileSync(new URL(`../examples/${name}.bower.json`, import.meta.url), "utf8")));

const insideStrict = ([x, y], r) => x > r.x + 0.5 && x < r.x + r.w - 0.5 && y > r.y + 0.5 && y < r.y + r.h - 0.5;

for (const name of ["bowerbird", "proposal-to-merge", "pi-packages"]) {
  test(`${name}: lays out with no warnings`, () => {
    const lay = layout(load(name));
    assert.deepEqual(lay.warnings, []);
  });

  test(`${name}: every route is orthogonal and avoids other nodes`, () => {
    const model = load(name);
    const lay = layout(model);
    for (const e of model.edges) {
      const pts = e._points;
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        assert.ok(a[0] === b[0] || a[1] === b[1], `${e.from}->${e.to} segment ${i} is diagonal`);
        for (const n of model.nodes) {
          if (n.id === e.from || n.id === e.to) continue;
          const r = lay.rects.get(n.id);
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          assert.ok(!insideStrict(mid, r), `${e.from}->${e.to} crosses node ${n.id}`);
        }
      }
    }
  });

  test(`${name}: layout is deterministic`, () => {
    const a = layout(load(name));
    const b = layout(load(name));
    assert.equal(JSON.stringify([...a.rects]), JSON.stringify([...b.rects]));
  });
}

test("facing lone ports align into a straight edge", () => {
  const model = normalise({
    schema: "bowerbird/v1", meta: { title: "t" },
    nodes: [{ id: "a", title: "A", at: [0, 0] }, { id: "b", title: "B", at: [1, 0] }],
    edges: [{ from: "a", to: "b" }],
  });
  layout(model);
  assert.equal(model.edges[0]._points.length, 2);
});

test("simplify drops duplicate and collinear points", () => {
  assert.deepEqual(simplify([[0, 0], [0, 0], [5, 0], [10, 0], [10, 5]]), [[0, 0], [10, 0], [10, 5]]);
});
