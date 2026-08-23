// Self-check for rowId, the one bit of real logic in the import.
// Run: node --experimental-strip-types lib/import-local-data.test.ts
import assert from "node:assert/strict";
import { rowId } from "./row-id.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const userA = "11111111-1111-1111-1111-111111111111";
const userB = "22222222-2222-2222-2222-222222222222";

// Well-formed v4 uuid, whatever goes in -- Postgres rejects anything else.
for (const local of [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "legacy-id-1", // pre-refactor data may carry a non-uuid
  "",
  "  ",
  "a".repeat(500),
]) {
  assert.match(rowId(userA, local), UUID_RE, `not a uuid for ${JSON.stringify(local)}`);
}

// Stable: the same input maps the same way, which is what makes a re-import
// upsert the same rows instead of duplicating.
assert.equal(rowId(userA, "x"), rowId(userA, "x"));

// Distinct per user: two accounts importing one browser's data must not
// collide on the primary key -- RLS rejects the second with 42501.
assert.notEqual(rowId(userA, "x"), rowId(userB, "x"));

// Distinct per record.
assert.notEqual(rowId(userA, "x"), rowId(userA, "y"));

// No collisions across a realistic batch.
const seen = new Set<string>();
for (const user of [userA, userB]) {
  for (let i = 0; i < 2000; i++) seen.add(rowId(user, `exercise-${i}`));
}
assert.equal(seen.size, 4000, "rowId collided");

console.log("rowId: all checks passed");
