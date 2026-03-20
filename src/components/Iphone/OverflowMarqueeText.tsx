import { useEffect, useRef, useState, type CSSProperties } from 'react';

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

  useEffect(() => {
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
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);
    window.addEventListener('resize', measure);

    return () => {
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
