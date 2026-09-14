import assert from "node:assert/strict";
import test from "node:test";
import { appDataCacheKey, readCachedAppData } from "./app-data.cache.ts";
import { EMPTY_STATE } from "./types.ts";

test("account switching never reads another Supabase user's cache", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null };
  const userA = "11111111-1111-1111-1111-111111111111";
  const userB = "22222222-2222-2222-2222-222222222222";

  values.set(
    appDataCacheKey(userA),
    JSON.stringify({ ...EMPTY_STATE, profile: { fullName: "Student A" } }),
  );
  values.set(
    appDataCacheKey(userB),
    JSON.stringify({ ...EMPTY_STATE, profile: { fullName: "Student B" } }),
  );

  assert.notEqual(appDataCacheKey(userA), appDataCacheKey(userB));
  assert.equal(readCachedAppData(storage, userA).profile.fullName, "Student A");
  assert.equal(readCachedAppData(storage, userB).profile.fullName, "Student B");
  assert.equal(readCachedAppData(storage, userA).profile.fullName, "Student A");
});

test("an unknown signed-in user starts with no previous account data", () => {
  const storage = { getItem: () => null };
  const state = readCachedAppData(storage, "33333333-3333-3333-3333-333333333333");

  assert.deepEqual(state.assessments, []);
  assert.equal(state.profile.fullName, "");
});
