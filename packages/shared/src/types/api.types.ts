export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: ApiError[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationMeta;
}

export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
