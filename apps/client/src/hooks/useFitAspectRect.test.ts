import { describe, expect, it } from "vitest";

import { fitAspectRect } from "./useFitAspectRect";

const aspectRatio = 700 / 650;

describe("fitAspectRect", () => {
  it("fits a wide container by height", () => {
    expect(
      fitAspectRect({
        aspectRatio,
        containerHeight: 500,
        containerWidth: 1000
      })
    ).toEqual({ width: 538, height: 500 });
  });

  it("fits a tall container by width", () => {
    expect(
      fitAspectRect({
        aspectRatio,
        containerHeight: 1000,
        containerWidth: 500
      })
    ).toEqual({ width: 500, height: 464 });
  });

  it("fits a small container without inventing a minimum size", () => {
    expect(
      fitAspectRect({
        aspectRatio,
        containerHeight: 180,
        containerWidth: 220
      })
    ).toEqual({ width: 193, height: 180 });
  });

  it("returns a zero fallback while the container is unmeasured", () => {
    expect(
      fitAspectRect({
        aspectRatio,
        containerHeight: 0,
        containerWidth: 500
      })
    ).toEqual({ width: 0, height: 0 });
  });
});
