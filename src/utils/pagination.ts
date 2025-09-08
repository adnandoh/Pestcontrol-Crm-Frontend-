// Pagination utility functions

export const PAGE_SIZE = 20; // Updated to match backend

export const calculateTotalPages = (totalCount: number): number => {
  return Math.ceil(totalCount / PAGE_SIZE);
};

export const getPageInfo = (currentPage: number, totalCount: number) => {
  const totalPages = calculateTotalPages(totalCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);
  
  return {
    currentPage,
    totalPages,
    totalCount,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

export const getPaginationParams = (page: number = 1) => ({
  page,
  page_size: PAGE_SIZE,
});
