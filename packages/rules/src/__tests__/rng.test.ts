import { describe, expect, it } from "vitest";

import { createRng } from "../rng";

describe("seeded RNG", () => {
  it("produces the same sequence for the same seed", () => {
    const first = createRng("packbound-seed").shuffle([1, 2, 3, 4, 5]);
    const second = createRng("packbound-seed").shuffle([1, 2, 3, 4, 5]);

    expect(second).toEqual(first);
  });

  it("forks deterministically from the current counter", () => {
    const first = createRng("root");
    const second = createRng("root");

    first.nextInt(10);
    second.nextInt(10);

    expect(second.fork("pack").nextUint32()).toBe(first.fork("pack").nextUint32());
  });
});
