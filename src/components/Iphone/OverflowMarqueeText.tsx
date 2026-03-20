import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface OverflowMarqueeTextProps {
  text: string;
  containerClassName?: string;
  textClassName?: string;
  gapPx?: number;
  pixelsPerSecond?: number;
}

export function OverflowMarqueeText({
  text,
  containerClassName,
  textClassName,
  gapPx = 48,
  pixelsPerSecond = 45,
}: OverflowMarqueeTextProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [distancePx, setDistancePx] = useState(0);

  useEffect(() => {
    const measure = () => {
      const containerEl = containerRef.current;
      const textEl = textRef.current;
      if (!containerEl || !textEl) return;

      const containerWidth = containerEl.clientWidth;
      const textWidth = textEl.scrollWidth;
      const overflowing = textWidth > containerWidth + 1;

      setIsOverflowing(overflowing);
      setDistancePx(overflowing ? textWidth + gapPx : 0);
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
  }, [text, gapPx]);

  const durationSec = Math.max(6, distancePx / pixelsPerSecond);
  const marqueeStyle = {
    '--iphone-marquee-distance': `${distancePx}px`,
    '--iphone-marquee-duration': `${durationSec}s`,
    '--iphone-marquee-gap': `${gapPx}px`,
  } as CSSProperties;

  return (
    <span
      ref={containerRef}
      className={`iphone-overflow-marquee ${containerClassName ?? ''}`.trim()}
    >
      {isOverflowing ? (
        <span className="iphone-overflow-marquee-track" style={marqueeStyle}>
          <span ref={textRef} className={textClassName}>
            {text}
          </span>
          <span className={textClassName} aria-hidden>
            {text}
          </span>
        </span>
      ) : (
        <span ref={textRef} className={textClassName}>
          {text}
        </span>
      )}
    </span>
  );
}
