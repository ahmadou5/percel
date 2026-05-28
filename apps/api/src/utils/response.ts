export interface ApiErrorItem {
  code?: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: ApiErrorItem[];
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: ApiErrorItem[];
}

export function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    errors: [],
  };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
): PaginatedResponse<T[]> {
  return {
    success: true,
    data,
    message,
    errors: [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function error(message: string, code?: string, errors?: ApiErrorItem[]): ApiErrorResponse {
  return {
    success: false,
    message,
    code,
    errors,
  };
}
