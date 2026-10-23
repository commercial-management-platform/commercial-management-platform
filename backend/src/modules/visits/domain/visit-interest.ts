/** How interested the client seemed during the visit. */
export enum InterestLevel {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/** Why the client's interest leans the way it does, when known. */
export enum InterestReason {
  Quality = 'quality',
  Price = 'price',
  QualityPrice = 'quality_price',
}
