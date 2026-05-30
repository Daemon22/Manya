import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { app } from "../src/app.js";

test("runs the seeded workflow and returns node logs", async () => {
  const list = await request(app).get("/api/workflows").expect(200);
  assert.equal(list.body.length > 0, true);

  const run = await request(app)
    .post(`/api/workflows/${list.body[0].id}/run`)
    .send({ input: { customer: "Manya" } })
    .expect(202);

  assert.equal(run.body.status, "completed");
  assert.equal(run.body.logs.length, list.body[0].nodes.length);
});
