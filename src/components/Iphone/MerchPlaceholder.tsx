import { useState } from 'react';
import { TitleBar } from './TitleBar';
import { BottomBar } from './BottomBar';
import { MerchListView } from './MerchListView';
import { MerchGridView } from './MerchGridView';
import { MerchProductPage, type ExpandedMediaPayload } from './MerchProductPage';
import { MerchCartView } from './MerchCartView';
import { useMerchProducts } from '../../hooks/useMerchProducts';
import { useMerchCart } from '../../hooks/useMerchCart';
import type { MerchProduct } from '../../types/merch';

type MerchView = 'list' | 'all' | 'cart';

export function MerchPlaceholder() {
  const { products, loading, error } = useMerchProducts();
  const { cart, addToCart, removeFromCart, updateQuantity, loading: cartLoading, lineCount, removingLineId, updatingLineId } = useMerchCart();
  const [currentView, setCurrentView] = useState<MerchView>('list');
  const [selectedProduct, setSelectedProduct] = useState<MerchProduct | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<ExpandedMediaPayload | null>(null);

  const handleViewChange = (view: MerchView) => {
    setCurrentView(view);
  };

  const handleProductSelect = (product: MerchProduct) => {
    setSelectedProduct(product);
  };

  const handleProductBack = () => {
    setSelectedProduct(null);
  };

  if (selectedProduct) {
    return (
      <div className="iphone-calendar iphone-merch">
        <MerchProductPage
          product={selectedProduct}
          onBack={handleProductBack}
          onAddToCart={addToCart}
          isAddingToCart={cartLoading}
          onExpandMedia={setExpandedMedia}
        />
        <BottomBar
          leftButton={<div className="iphone-merch-bottom-bar-left-empty" />}
          centerContent={
            <div className="iphone-calendar-segmented-control iphone-merch-segmented-control">
              <button
                className="iphone-calendar-segmented-button"
                onClick={() => { setSelectedProduct(null); setCurrentView('list'); }}
              >
                List
              </button>
              <button
                className="iphone-calendar-segmented-button"
                onClick={() => { setSelectedProduct(null); setCurrentView('all'); }}
              >
                All
              </button>
            </div>
          }
          rightButton={
            <div className="iphone-merch-cart-button-wrap">
              <button
                type="button"
                className="iphone-calendar-segmented-button iphone-merch-cart-tab"
                onClick={() => { setSelectedProduct(null); setCurrentView('cart'); }}
              >
                Cart
                {lineCount > 0 && <span className="iphone-merch-cart-badge">{lineCount}</span>}
              </button>
            </div>
          }
        />
        {/* Full-screen media overlay (covers product page + bottom bar) */}
        {expandedMedia && (
          <div
            className="iphone-merch-product-media-expanded"
            onClick={() => setExpandedMedia(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(k) => k.key === 'Escape' && setExpandedMedia(null)}
            aria-label="Close"
          >
            <button
              type="button"
              className="iphone-merch-product-media-expanded-close"
              onClick={(e) => { e.stopPropagation(); setExpandedMedia(null); }}
              aria-label="Close"
            />
            {expandedMedia.type === 'video' && (
              expandedMedia.videoIsEmbed ? (
                <div className="iphone-merch-product-media-expanded-inner" onClick={(e) => e.stopPropagation()}>
                  <iframe
                    src={expandedMedia.videoUrl}
                    title=""
                    className="iphone-merch-product-media-expanded-embed"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  className="iphone-merch-product-media-expanded-video"
                  src={expandedMedia.videoUrl}
                  playsInline
                  muted
                  loop
                  autoPlay
                  onClick={(e) => e.stopPropagation()}
                />
              )
            )}
            {expandedMedia.type === 'photo' && (
              <img
                src={expandedMedia.imageUrl}
                alt=""
                className="iphone-merch-product-media-expanded-image"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="iphone-calendar iphone-merch">
      <TitleBar title="Merch" />

      {/* Content Area: list view or All (Camera Roll style grid), or not-connected message */}
      <div className="iphone-calendar-content">
        {loading && (
          <div className="iphone-merch-empty">
            <p>Loading…</p>
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="iphone-merch-empty">
            <p>Items didn't load. Please refresh.</p>
          </div>
        )}
        {!loading && products.length > 0 && currentView === 'list' && (
          <MerchListView products={products} onProductSelect={handleProductSelect} />
        )}
        {!loading && products.length > 0 && currentView === 'all' && (
          <MerchGridView products={products} onProductSelect={handleProductSelect} />
        )}
        {currentView === 'cart' && (
          <MerchCartView
            lines={cart?.lines ?? []}
            subtotal={cart?.subtotal ?? ''}
            checkoutUrl={cart?.checkoutUrl ?? null}
            onRemoveLine={removeFromCart}
            removingLineId={removingLineId}
            onUpdateQuantity={updateQuantity}
            updatingLineId={updatingLineId}
            onLineClick={(line) => {
              const product =
                (line.productId && products.find((p) => p.id === line.productId)) ||
                products.find((p) => p.name === line.title);
              if (product) setSelectedProduct(product);
            }}
          />
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomBar
        leftButton={<div className="iphone-merch-bottom-bar-left-empty" />}
        centerContent={
          <div className="iphone-calendar-segmented-control iphone-merch-segmented-control">
            <button
              className={`iphone-calendar-segmented-button ${currentView === 'list' ? 'iphone-calendar-segmented-button-selected' : ''}`}
              onClick={() => handleViewChange('list')}
            >
              List
            </button>
            <button
              className={`iphone-calendar-segmented-button ${currentView === 'all' ? 'iphone-calendar-segmented-button-selected' : ''}`}
              onClick={() => handleViewChange('all')}
            >
              All
            </button>
          </div>
        }
        rightButton={
          <div className="iphone-merch-cart-button-wrap">
            <button
              type="button"
              className={`iphone-calendar-segmented-button iphone-merch-cart-tab ${currentView === 'cart' ? 'iphone-calendar-segmented-button-selected' : ''}`}
              onClick={() => handleViewChange('cart')}
            >
              Cart
              {lineCount > 0 && <span className="iphone-merch-cart-badge">{lineCount}</span>}
            </button>
          </div>
        }
      />
    </div>
  );
}
