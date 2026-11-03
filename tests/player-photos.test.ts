import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { getPlayerPhoto } from "../src/lib/player-photos";

test("Xavier's award photo uses the user-selected 183904 still for every name alias", () => {
  for (const name of ["DYLAN", "u4 Pablo", "XAVIER LAFLAMME", " Xavier Laflamme "]) {
    const photo = getPlayerPhoto(name);
    assert.equal(photo.src, "/images/gallery/screenshots/Screenshot 2026-03-16 183904.webp");
    assert.equal(photo.alt, "Xavier Laflamme on the rush");
    assert.ok(existsSync(`public${photo.src}`));
  }
});
