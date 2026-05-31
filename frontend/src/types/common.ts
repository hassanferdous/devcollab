export interface PaginationMeta {
  count: number
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  prevPage: number | null
  nextPage: number | null
}

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  pagination?: PaginationMeta
}
