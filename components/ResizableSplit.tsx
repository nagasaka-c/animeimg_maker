"use client";

import { useCallback, useRef, useState } from "react";

const MIN_TOP = 200;
const MAX_TOP = 900;
const DEFAULT_TOP = 420;

type Props = {
  top: React.ReactNode;
  bottom: React.ReactNode;
};

export default function ResizableSplit({ top, bottom }: Props) {
  const [topHeight, setTopHeight] = useState(DEFAULT_TOP);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      startY.current = e.clientY;
      startHeight.current = topHeight;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [topHeight]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    setTopHeight(Math.max(MIN_TOP, Math.min(MAX_TOP, startHeight.current + dy)));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return (
    <div className="flex flex-col w-full">
      <div
        style={{ height: topHeight }}
        className="w-full overflow-y-auto scrollbar-auto"
      >
        {top}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="ドラッグして領域の高さを調整できます"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="group relative h-6 cursor-row-resize select-none flex items-center justify-center my-2"
      >
        <div className="h-1.5 w-16 rounded-full bg-border-soft transition-colors group-hover:bg-muted" />
      </div>
      <div className="w-full flex">{bottom}</div>
    </div>
  );
}
