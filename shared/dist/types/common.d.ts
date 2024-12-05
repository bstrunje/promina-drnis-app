export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}
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
export interface ApiError {
    code: string;
    message: string;
    status: number;
}
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
export interface DateRange {
    startDate: Date;
    endDate: Date;
}
export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
}
export type StatusType = 'active' | 'inactive' | 'pending' | 'archived';
