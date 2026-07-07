import { useEffect, useRef, useState } from "react";

export type FitAspectRect = {
  readonly width: number;
  readonly height: number;
};

export const fitAspectRect = ({
  aspectRatio,
  containerHeight,
  containerWidth
}: {
  readonly aspectRatio: number;
  readonly containerHeight: number;
  readonly containerWidth: number;
}): FitAspectRect => {
  if (aspectRatio <= 0 || containerHeight <= 0 || containerWidth <= 0) {
    return { width: 0, height: 0 };
  }

  const widthFromHeight = containerHeight * aspectRatio;
  if (widthFromHeight <= containerWidth) {
    return {
      width: Math.floor(widthFromHeight),
      height: Math.floor(containerHeight)
    };
  }

  return {
    width: Math.floor(containerWidth),
    height: Math.floor(containerWidth / aspectRatio)
  };
};

const sameRect = (left: FitAspectRect, right: FitAspectRect): boolean =>
  left.width === right.width && left.height === right.height;

export const useFitAspectRect = (aspectRatio: number) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<FitAspectRect>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const update = (containerWidth: number, containerHeight: number) => {
      const nextRect = fitAspectRect({
        aspectRatio,
        containerHeight,
        containerWidth
      });
      setRect((current) => (sameRect(current, nextRect) ? current : nextRect));
    };

    const measure = () => {
      const box = container.getBoundingClientRect();
      update(box.width, box.height);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        measure();
        return;
      }
      update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [aspectRatio]);

  return { containerRef, rect };
};
