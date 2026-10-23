import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalise } from "../lib/model.mjs";
import { layout } from "../lib/layout.mjs";
import { isoLayout, tagBox, zoneLabelBox } from "../lib/render-iso.mjs";

const raw = (name) => JSON.parse(readFileSync(new URL(`../examples/${name}.bower.json`, import.meta.url), "utf8"));
const EXAMPLES = ["bowerbird", "proposal-to-merge", "pi-packages"];

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const name of EXAMPLES) {
  for (const direction of ["LR", "TD"]) {
    test(`${name} ${direction}: flat layout has no warnings`, () => {
      const d = raw(name);
      d.meta.direction = direction;
      assert.deepEqual(layout(normalise(d)).warnings, []);
    });

    test(`${name} ${direction}: no iso label overlaps a tag, zone label, or another label`, () => {
      const d = raw(name);
      d.meta.direction = direction;
      const model = normalise(d);
      const iso = isoLayout(model, layout(model));
      const boxes = [
        ...iso.slabs.filter((s) => s.n.title).map((s) => tagBox(s, model.meta.statusTracking)),
        ...iso.zones.map(zoneLabelBox),
        ...iso.labels.map((l) => l.box),
      ];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlap(boxes[i], boxes[j]), `boxes ${i} and ${j} overlap`);
      }
      assert.deepEqual(iso.warnings, []);
    });
  }
}

test("TD transposes cells, spans, gaps, and pinned sides", () => {
  const m = normalise({
    schema: "bowerbird/v1", meta: { title: "t", direction: "TD", grid: { col: 250, row: 165, gap: [180, 60] } },
    nodes: [{ id: "a", title: "A", at: [2, 0], span: [2, 1] }, { id: "b", title: "B", at: [0, 1] }],
    edges: [{ from: "a", to: "b", fromSide: "right" }],
  });
  assert.deepEqual(m.nodes[0].at, [0, 2]);
  assert.deepEqual(m.nodes[0].span, [1, 2]);
  assert.deepEqual(m.meta.grid.gap, [60, 180]);
  assert.equal(m.meta.grid.col - 60, 250 - 180, "node width preserved");
  assert.equal(m.meta.grid.row - 180, 165 - 60, "node height preserved");
  assert.equal(m.edges[0].fromSide, "bottom");
});
