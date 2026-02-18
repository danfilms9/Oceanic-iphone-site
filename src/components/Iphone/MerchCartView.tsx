import type { CartLine } from '../../services/shopifyCartService';
import { MerchImage } from './MerchImage';

interface MerchCartViewProps {
  lines: CartLine[];
  subtotal: string;
  checkoutUrl: string | null;
  onRemoveLine?: (lineId: string) => void;
  removingLineId?: string | null;
  onUpdateQuantity?: (lineId: string, quantity: number) => void;
  updatingLineId?: string | null;
  onLineClick?: (line: CartLine) => void;
}

export function MerchCartView({
  lines,
  subtotal,
  checkoutUrl,
  onRemoveLine,
  removingLineId,
  onUpdateQuantity,
  updatingLineId,
  onLineClick,
}: MerchCartViewProps) {
  if (lines.length === 0) {
    return (
      <div className="iphone-merch-cart-empty">
        <p>Your cart is empty.</p>
        <p className="iphone-merch-cart-empty-hint">Add items from the list to continue.</p>
      </div>
    );
  }

  return (
    <div className="iphone-merch-cart">
      <div className="iphone-merch-cart-lines">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`iphone-merch-cart-line${removingLineId === line.id ? ' iphone-merch-cart-line-removing' : ''}`}
          >
            <div
              className="iphone-merch-cart-line-clickable"
              role={onLineClick ? 'button' : undefined}
              tabIndex={onLineClick ? 0 : undefined}
              onClick={() => onLineClick?.(line)}
              onKeyDown={(e) => onLineClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onLineClick(line))}
            >
              <div className="iphone-merch-cart-line-image">
                {line.imageUrl ? (
                  <MerchImage src={line.imageUrl} alt="" />
                ) : (
                  <div className="iphone-merch-cart-line-placeholder" aria-hidden />
                )}
              </div>
              <div className="iphone-merch-cart-line-details">
                <div className="iphone-merch-cart-line-details-inner">
                  <div className="iphone-merch-cart-line-details-top">
                    <div className="iphone-merch-cart-line-title">{line.title}</div>
                    {line.variantTitle && (
                      <div className="iphone-merch-cart-line-variant">{line.variantTitle}</div>
                    )}
                  </div>
                  <div className="iphone-merch-cart-line-details-bottom">
                    <span className="iphone-merch-cart-line-price">
                      {onUpdateQuantity ? line.price : `Qty ${line.quantity} · ${line.price}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {onUpdateQuantity && (
              <div
                className="iphone-merch-cart-line-quantity-wrap"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="iphone-merch-cart-line-quantity-btn"
                  disabled={updatingLineId === line.id}
                  aria-label={`Decrease quantity for ${line.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (line.quantity <= 1) {
                      onRemoveLine?.(line.id);
                    } else {
                      onUpdateQuantity(line.id, line.quantity - 1);
                    }
                  }}
                >
                  −
                </button>
                <span className="iphone-merch-cart-line-quantity-num" aria-live="polite">
                  {updatingLineId === line.id ? '…' : line.quantity}
                </span>
                <button
                  type="button"
                  className="iphone-merch-cart-line-quantity-btn"
                  disabled={updatingLineId === line.id}
                  aria-label={`Increase quantity for ${line.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateQuantity(line.id, line.quantity + 1);
                  }}
                >
                  +
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="iphone-merch-cart-footer">
        <div className="iphone-merch-cart-subtotal">
          Subtotal: <strong>{subtotal}</strong>
        </div>
        {checkoutUrl && (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="iphone-merch-checkout-button"
          >
            Checkout
          </a>
        )}
      </div>
    </div>
  );
}
