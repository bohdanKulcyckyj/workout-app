/**
 * Derive the row id for an imported record, from the owner and its local id.
 *
 * Not the local id verbatim, for two reasons. `id` is the sole primary key, so
 * two users importing the same browser's data would collide -- and RLS rejects
 * the second one with 42501 rather than letting it through, so their import
 * would fail outright (verified against the stack, not assumed). Legacy data
 * may also carry a non-uuid id, which Postgres rejects.
 *
 * Deriving from (userId, localId) fixes both: stable per user, so a re-run
 * upserts the same rows and stays idempotent; distinct across users, so two
 * accounts each get their own copy.
 *
 * Its own module so the self-check next to it runs under plain
 * `node --experimental-strip-types` -- it has no imports to resolve.
 *
 * ponytail: FNV-1a over 4 salted passes, not a real hash -- these ids only need
 * to be stable and collision-free in practice, not unpredictable.
 */
export function rowId(userId: string, localId: string): string {
  const hex = [0, 1, 2, 3]
    .map((salt) => {
      let h = 0x811c9dc5;
      for (const ch of `${salt}:${userId}:${localId}`) {
        h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
      }
      return h.toString(16).padStart(8, "0");
    })
    .join("");
  // Stamp version 4 and the RFC-4122 variant, so it is a well-formed uuid.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}
