import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

interface OverflowMarqueeTextProps {
  text: string;
  containerClassName?: string;
  textClassName?: string;
  endPaddingPx?: number;
}

export function OverflowMarqueeText({
  text,
  containerClassName,
  textClassName,
  endPaddingPx = 20,
}: OverflowMarqueeTextProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollDistancePx, setScrollDistancePx] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const containerEl = containerRef.current;
      const textEl = textRef.current;
      if (!containerEl || !textEl) return;

      const containerWidth = containerEl.clientWidth;
      const textWidth = textEl.scrollWidth;
      const overflowing = textWidth > containerWidth + 1;

      setIsOverflowing(overflowing);
      setScrollDistancePx(overflowing ? textWidth - containerWidth + endPaddingPx : 0);
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 400);
    const t3 = setTimeout(measure, 800);
    const t4 = setTimeout(measure, 1400);
    const t5 = setTimeout(measure, 2200);
    const poll = setInterval(measure, 250);
    const pollStop = setTimeout(() => clearInterval(poll), 3000);

    // Re-check once web fonts are confirmed loaded; this often changes text width.
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => measure()).catch(() => {});

    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearInterval(poll);
      clearTimeout(pollStop);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [text, endPaddingPx]);

  const marqueeStyle = {
    '--scroll-distance': `${scrollDistancePx}px`,
  } as CSSProperties;

  return (
    <span
      ref={containerRef}
      className={`iphone-overflow-marquee ${containerClassName ?? ''}`.trim()}
    >
      <span
        ref={textRef}
        className={`${textClassName ?? ''} ${isOverflowing ? 'iphone-overflow-title-scrolling' : ''}`.trim()}
        style={isOverflowing ? marqueeStyle : undefined}
      >
        {text}
      </span>
    </span>
  );
}
