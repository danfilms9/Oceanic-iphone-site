import { getMerchProductImageUrl } from '../../types/merch';
import type { MerchProduct } from '../../types/merch';
import { MerchImage } from './MerchImage';

interface MerchGridViewProps {
  products: MerchProduct[];
  onProductSelect?: (product: MerchProduct) => void;
}

export function MerchGridView({ products, onProductSelect }: MerchGridViewProps) {
  return (
    <div className="iphone-merch-grid-wrapper">
      <div className="iphone-merch-grid">
        {products.map((product) => {
          const imageUrl = getMerchProductImageUrl(product);
          return (
            <button
              key={product.id}
              type="button"
              className="iphone-merch-grid-thumb"
              onClick={() => onProductSelect?.(product)}
            >
              {imageUrl ? (
                <MerchImage src={imageUrl} alt="" className="iphone-merch-grid-thumb-img" />
              ) : (
                <div className="iphone-merch-grid-thumb-placeholder" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
