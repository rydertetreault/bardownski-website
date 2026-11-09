import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { getPlayerPhoto } from "../src/lib/player-photos";

test("Xavier's award photo uses the close-up highlight frame for every name alias", () => {
  for (const name of ["DYLAN", "u4 Pablo", "XAVIER LAFLAMME", " Xavier Laflamme "]) {
    const photo = getPlayerPhoto(name);
    assert.equal(photo.src, "/images/players/xavier-celebration.webp");
    assert.equal(photo.alt, "Xavier Laflamme celebrating by the bench");
    assert.ok(existsSync(`public${photo.src}`));
  }
});

test("Wolfgang's award photo uses the behind-the-net gallery still for every name alias", () => {
  for (const name of ["COLIN", "WOLFGANG MOZART", " Wolfgang Mozart "]) {
    const photo = getPlayerPhoto(name);
    assert.equal(photo.src, "/images/gallery/screenshots/matt-alt-2027.webp");
    assert.ok(existsSync(`public${photo.src}`));
  }
});
