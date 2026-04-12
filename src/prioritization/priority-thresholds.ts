import { ProductPriority } from '../product/entities/product-priority.enum';

/**
 * Maps composite score percent (0–100) from the prioritization engine to product priority bands.
 */
export function mapCompositePercentToProductPriority(
  scorePercent: number,
): ProductPriority {
  if (scorePercent >= 70) {
    return ProductPriority.Critical;
  }
  if (scorePercent >= 50) {
    return ProductPriority.High;
  }
  if (scorePercent >= 25) {
    return ProductPriority.Medium;
  }
  return ProductPriority.Low;
}
