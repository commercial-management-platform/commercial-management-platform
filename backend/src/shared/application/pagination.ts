/**
 * Standard pagination of the project: ?page=1&limit=20, page from 1 and
 * limit up to 100. Every paginated endpoint answers { data, total, page, limit }.
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PageRequest {
  /** 1-based page number. */
  page: number;
  limit: number;
}

export interface Paginated<T> extends PageRequest {
  data: T[];
  /** Number of items that match the filters, across every page. */
  total: number;
}

/** Number of items to skip before `page`. */
export function pageOffset({ page, limit }: PageRequest): number {
  return (page - 1) * limit;
}
