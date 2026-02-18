import { useState } from 'react';

interface MerchImageProps {
  src: string;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
}

/**
 * Renders an image with a loading spinner (same style as YouTube/Notes app) until loaded.
 */
export function MerchImage({ src, alt = '', className = '', wrapperClassName = '' }: MerchImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`iphone-merch-image-wrap ${wrapperClassName}`}>
      {!loaded && (
        <div className="iphone-merch-image-loading" aria-hidden>
          <div className="iphone-merch-image-loading-spinner" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`iphone-merch-image-img ${className} ${!loaded ? 'iphone-merch-image-pending' : ''}`}
        loading="eager"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
