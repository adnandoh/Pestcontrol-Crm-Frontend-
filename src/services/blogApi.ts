import axios from 'axios';
import { apiConfig } from '../config/api.config';
import type {
  Blog,
  BlogListItem,
  BlogCategory,
  BlogTag,
  BlogFormData,
  BlogDashboardStats,
  BlogFilters,
  PaginatedResponse,
} from '../types';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.headers = { ...config.headers, ...getAuthHeaders() } as any;
  return config;
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getBlogDashboard = async (): Promise<BlogDashboardStats> => {
  const { data } = await api.get('/blogs/dashboard-stats/');
  return data;
};

// ─── Blog CRUD ────────────────────────────────────────────────────────────────

export const getBlogs = async (filters: BlogFilters = {}): Promise<PaginatedResponse<BlogListItem>> => {
  const params: Record<string, any> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.category) params.category = filters.category;
  if (filters.tag) params.tag = filters.tag;
  if (filters.ordering) params.ordering = filters.ordering;
  params.page = filters.page || 1;
  params.page_size = filters.page_size || 10;
  const { data } = await api.get('/blogs/', { params });
  return data;
};

export const getBlog = async (id: number): Promise<Blog> => {
  const { data } = await api.get(`/blogs/${id}/`);
  return data;
};

export const createBlog = async (formData: BlogFormData): Promise<Blog> => {
  const fd = buildFormData(formData);
  const { data } = await api.post('/blogs/create/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const updateBlog = async (id: number, formData: Partial<BlogFormData>): Promise<Blog> => {
  const fd = buildFormData(formData);
  const { data } = await api.patch(`/blogs/${id}/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteBlog = async (id: number): Promise<void> => {
  await api.delete(`/blogs/${id}/delete/`);
};

export const togglePublish = async (id: number): Promise<{ status: string; publish_date: string }> => {
  const { data } = await api.patch(`/blogs/${id}/toggle-publish/`);
  return data;
};

// ─── Image Upload ─────────────────────────────────────────────────────────────

export const uploadBlogImage = async (
  file: File,
  altText = '',
  title = ''
): Promise<{ url: string; path: string; alt_text?: string; title?: string }> => {
  const fd = new FormData();
  fd.append('image', file);
  if (altText) fd.append('alt_text', altText);
  if (title) fd.append('title', title);
  const { data } = await api.post('/blogs/upload-image/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async (): Promise<BlogCategory[]> => {
  const { data } = await api.get('/blogs/categories/');
  return data;
};

export const createCategory = async (payload: { name: string; description?: string; meta_title?: string; meta_description?: string }): Promise<BlogCategory> => {
  const { data } = await api.post('/blogs/categories/', payload);
  return data;
};

export const deleteCategory = async (id: number): Promise<void> => {
  await api.delete(`/blogs/categories/${id}/`);
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const getTags = async (): Promise<BlogTag[]> => {
  const { data } = await api.get('/blogs/tags/');
  return data;
};

export const createTag = async (name: string): Promise<BlogTag> => {
  const { data } = await api.post('/blogs/tags/', { name });
  return data;
};

export const deleteTag = async (id: number): Promise<void> => {
  await api.delete(`/blogs/tags/${id}/`);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFormData(obj: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    // Empty string breaks PrimaryKeyRelatedField for category_id / numeric fields
    if (value === '') continue;
    if (key === 'featured_image' && value instanceof File) {
      fd.append('featured_image', value);
    } else if (key === 'tag_ids' && Array.isArray(value)) {
      value.forEach((id: number) => fd.append('tag_ids', String(id)));
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}
