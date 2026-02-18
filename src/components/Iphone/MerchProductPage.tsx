import { useState, useMemo, useEffect } from 'react';
import { TitleBar } from './TitleBar';
import { MerchImage } from './MerchImage';
import { getMerchProductImageUrl, getVariantOptionValue } from '../../types/merch';
import type { MerchProduct, MerchProductVariant, MerchProductMediaItem } from '../../types/merch';

const SIZE_OPTION_NAMES = ['Size', 'size', 'SIZE'];

function getSizeOptionName(variants: MerchProductVariant[]): string | null {
  const first = variants[0]?.selectedOptions;
  if (!first?.length) return null;
  const sizeOpt = first.find((o) => SIZE_OPTION_NAMES.includes(o.name));
  return sizeOpt ? sizeOpt.name : first[0].name;
}

export type ExpandedMediaPayload = { type: 'video'; videoUrl: string; videoIsEmbed: boolean } | { type: 'photo'; imageUrl: string };

interface MerchProductPageProps {
  product: MerchProduct;
  onBack: () => void;
  onAddToCart?: (variantId: string, quantity?: number) => Promise<void>;
  isAddingToCart?: boolean;
  onExpandMedia?: (payload: ExpandedMediaPayload) => void;
}

export function MerchProductPage({ product, onBack, onAddToCart, isAddingToCart = false, onExpandMedia }: MerchProductPageProps) {
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const variants = product.variants && product.variants.length > 0 ? product.variants : null;
  const optionName = useMemo(() => (variants ? getSizeOptionName(variants) : null), [variants]);
  const firstVariantId = variants?.[0]?.id ?? product.variantId;
  const hasMultipleSizes = variants && variants.length > 1;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasMultipleSizes ? null : firstVariantId ?? null
  );

  const effectiveVariantId = hasMultipleSizes
    ? selectedVariantId
    : (selectedVariantId ?? firstVariantId ?? product.variantId);
  const selectedVariant = useMemo(
    () => variants?.find((v) => v.id === effectiveVariantId),
    [variants, effectiveVariantId]
  );
  const displayPrice = selectedVariant?.price ?? product.price;

  const handleAddToCart = async () => {
    if (!effectiveVariantId || !onAddToCart) return;
    setAddError(null);
    try {
      await onAddToCart(effectiveVariantId, 1);
      setAdded(true);
    } catch {
      setAddError('Could not add to cart. Try again.');
    }
  };

  const addToCartDisabled = !effectiveVariantId || isAddingToCart;

  const imageUrl = getMerchProductImageUrl(product);
  const videoUrl = product.videoUrl || undefined;
  const videoIsEmbed = !!product.videoIsEmbed;
  const hasVideo = !!videoUrl;
  const hasImage = !!imageUrl;

  /** Ordered slides for carousel: video first, then images (from productMedia or fallback) */
  const slides = useMemo((): MerchProductMediaItem[] => {
    let list: MerchProductMediaItem[];
    if (product.productMedia && product.productMedia.length > 0) {
      list = [...product.productMedia];
    } else {
      list = [];
      if (videoUrl) list.push({ type: 'video', url: videoUrl, videoIsEmbed: videoIsEmbed });
      if (imageUrl) list.push({ type: 'image', url: imageUrl });
    }
    return list.sort((a, b) => (a.type === 'video' && b.type === 'image' ? -1 : a.type === 'image' && b.type === 'video' ? 1 : 0));
  }, [product.productMedia, videoUrl, videoIsEmbed, imageUrl]);

  const slideCount = slides.length;
  const firstVideoIndex = useMemo(
    () => (slideCount > 0 ? Math.max(0, slides.findIndex((s) => s.type === 'video')) : 0),
    [slides, slideCount]
  );
  const [mediaIndex, setMediaIndex] = useState(firstVideoIndex);

  useEffect(() => {
    setMediaIndex(firstVideoIndex);
  }, [firstVideoIndex]);

  useEffect(() => {
    if (slideCount > 0 && mediaIndex >= slideCount) setMediaIndex(Math.max(0, slideCount - 1));
  }, [slideCount, mediaIndex]);

  const showChevronRight = slideCount > 1 && mediaIndex < slideCount - 1;
  const showChevronLeft = slideCount > 1 && mediaIndex > 0;

  const handleMediaClick = (e: React.MouseEvent, item: MerchProductMediaItem) => {
    e.stopPropagation();
    if (!onExpandMedia) return;
    if (item.type === 'video') onExpandMedia({ type: 'video', videoUrl: item.url, videoIsEmbed: !!item.videoIsEmbed });
    if (item.type === 'image') onExpandMedia({ type: 'photo', imageUrl: item.url });
  };

  return (
    <div className="iphone-merch-product-page">
      <TitleBar
        title={product.name}
        showBackButton
        backButtonText="Merch"
        onBack={onBack}
      />
      <div className="iphone-merch-product-content">
        <div className="iphone-merch-product-media-wrap">
          <div
            className="iphone-merch-product-media-track"
            style={{
              width: slideCount > 0 ? `${slideCount * 100}%` : '100%',
              transform: slideCount > 0 ? `translateX(${(-mediaIndex * 100) / slideCount}%)` : 'translateX(0)',
            }}
          >
            {slideCount === 0 ? (
              <div className="iphone-merch-product-media-slide">
                <div className="iphone-merch-product-image-placeholder" aria-hidden />
              </div>
            ) : (
              slides.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className="iphone-merch-product-media-slide"
                  style={{ flex: `0 0 ${100 / slideCount}%`, width: `${100 / slideCount}%` }}
                >
                  {item.type === 'video' ? (
                    item.videoIsEmbed ? (
                      <div
                        className="iphone-merch-product-media-tappable"
                        onClick={(e) => handleMediaClick(e, item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(k) => k.key === 'Enter' && handleMediaClick(k as unknown as React.MouseEvent, item)}
                        aria-label="View video full size"
                      >
                        <iframe
                          src={item.url}
                          title=""
                          className="iphone-merch-product-video-embed"
                          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        src={item.url}
                        className="iphone-merch-product-video iphone-merch-product-media-tappable"
                        playsInline
                        muted
                        loop
                        autoPlay
                        onClick={(e) => handleMediaClick(e, item)}
                        role="button"
                        aria-label="View video full size"
                      />
                    )
                  ) : (
                    <div
                      className="iphone-merch-product-media-tappable"
                      onClick={(e) => handleMediaClick(e, item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(k) => k.key === 'Enter' && handleMediaClick(k as unknown as React.MouseEvent, item)}
                      aria-label="View photo full size"
                    >
                      <MerchImage
                        src={item.url}
                        alt=""
                        wrapperClassName="iphone-merch-image-wrap-fill"
                        className="iphone-merch-product-image"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {showChevronRight && (
            <button
              type="button"
              className="iphone-merch-product-media-chevron iphone-merch-product-media-chevron-right"
              onClick={() => setMediaIndex((i) => Math.min(i + 1, slideCount - 1))}
              aria-label="Next"
            />
          )}
          {showChevronLeft && (
            <button
              type="button"
              className="iphone-merch-product-media-chevron iphone-merch-product-media-chevron-left"
              onClick={() => setMediaIndex((i) => Math.max(i - 1, 0))}
              aria-label="Previous"
            />
          )}
        </div>
        <div className="iphone-merch-product-details">
          <div className="iphone-merch-product-title-row">
            <h2 className="iphone-merch-product-title">{product.name}</h2>
            <p className="iphone-merch-product-price">{displayPrice}</p>
          </div>
          {product.description && product.description.trim() && (
            <p className="iphone-merch-product-description">{product.description.trim()}</p>
          )}
          {variants && optionName && variants.length > 1 && (
            <div className="iphone-merch-variant-options">
              <div className="iphone-merch-variant-option-buttons">
                {variants.map((v) => {
                  const value = getVariantOptionValue(v, optionName) ?? v.id;
                  const isSelected = v.id === effectiveVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`iphone-merch-variant-option-btn ${isSelected ? 'iphone-merch-variant-option-btn-selected' : ''}`}
                      onClick={() => setSelectedVariantId(v.id)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {onAddToCart && (
            <div className="iphone-merch-product-actions">
              <button
                type="button"
                className="iphone-merch-add-to-cart-button"
                onClick={handleAddToCart}
                disabled={addToCartDisabled}
              >
                {isAddingToCart ? 'Adding…' : added ? 'Added to cart' : 'Add to cart'}
              </button>
              {addError && <p className="iphone-merch-add-to-cart-error">{addError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
