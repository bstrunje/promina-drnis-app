// shared/types/common.ts

// Pagination related types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// Response wrapper types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// Filter and sort types
export interface FilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
  search?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Date range type
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Status and validation types
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export type StatusType = 'active' | 'inactive' | 'pending' | 'archived';