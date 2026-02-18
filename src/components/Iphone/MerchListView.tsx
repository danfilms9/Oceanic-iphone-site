import { getMerchProductImageUrl } from '../../types/merch';
import type { MerchProduct } from '../../types/merch';
import { MerchImage } from './MerchImage';

interface MerchListViewProps {
  products: MerchProduct[];
  onProductSelect?: (product: MerchProduct) => void;
}

export function MerchListView({ products, onProductSelect }: MerchListViewProps) {
  return (
    <div className="iphone-calendar-list-view">
      <div className="iphone-calendar-events-list">
        {products.map((product) => {
          const imageUrl = getMerchProductImageUrl(product);
          return (
          <button
            key={product.id}
            type="button"
            className="iphone-calendar-event-row iphone-merch-product-row iphone-merch-product-row-button"
            onClick={() => onProductSelect?.(product)}
          >
            {/* Product image in the square (where the date used to be) */}
            <div className="iphone-merch-product-thumb">
              {imageUrl ? (
                <MerchImage
                  src={imageUrl}
                  alt=""
                  className="iphone-merch-product-thumb-img"
                />
              ) : (
                <div className="iphone-merch-product-thumb-placeholder" aria-hidden />
              )}
            </div>

            {/* Product name */}
            <div className="iphone-calendar-event-content">
              <div className="iphone-calendar-event-title">{product.name}</div>
            </div>

            {/* Same chevron as Photos app main page */}
            <span className="iphone-photos-item-chevron" />
          </button>
          );
        })}
      </div>
    </div>
  );
}
