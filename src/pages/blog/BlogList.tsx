import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Edit, Trash2, Eye, FileText,
  Clock, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, RefreshCw, Globe
} from 'lucide-react';
import { getBlogs, deleteBlog, togglePublish } from '../../services/blogApi';
import type { BlogListItem, BlogFilters } from '../../types';
import { cn } from '../../utils/cn';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const PAGE_SIZE = 10;

const BlogList: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BlogFilters>({ status: '', search: '', page: 1, page_size: PAGE_SIZE });
  const [searchInput, setSearchInput] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pagination, setPagination] = useState({ count: 0, totalPages: 0, current: 1 });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BlogListItem | null>(null);

  const loadBlogs = useCallback(async (overrides?: Partial<BlogFilters>) => {
    try {
      setLoading(true);
      const activeFilters = { ...filters, ...overrides };
      const res = await getBlogs(activeFilters);
      setBlogs(res.results);
      setPagination({
        count: res.count,
        totalPages: Math.ceil(res.count / PAGE_SIZE),
        current: activeFilters.page || 1,
      });
    } catch (err) {
      console.error('Failed to load blogs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadBlogs(); }, []);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => {
      const updated = { ...filters, search: value, page: 1 };
      setFilters(updated);
      loadBlogs(updated);
    }, 400);
    setSearchTimer(t);
  };

  const handleFilter = (key: keyof BlogFilters, value: string) => {
    const updated = { ...filters, [key]: value, page: 1 };
    setFilters(updated);
    loadBlogs(updated);
  };

  const handlePage = (page: number) => {
    const updated = { ...filters, page };
    setFilters(updated);
    loadBlogs(updated);
  };

  const handleTogglePublish = async (blog: BlogListItem) => {
    setTogglingId(blog.id);
    try {
      const res = await togglePublish(blog.id);
      setBlogs(prev => prev.map(b =>
        b.id === blog.id ? { ...b, status: res.status as any, publish_date: res.publish_date } : b
      ));
    } catch (err) {
      console.error('Toggle publish failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteBlog(confirmDelete.id);
      setBlogs(prev => prev.filter(b => b.id !== confirmDelete.id));
      setPagination(prev => ({ ...prev, count: prev.count - 1 }));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Blogs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.count} total posts</p>
        </div>
        <Link
          to="/blog/create"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Blog
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <select
          value={filters.status || ''}
          onChange={e => handleFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <button
          onClick={() => loadBlogs()}
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No blogs found</p>
            <Link to="/blog/create" className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium">
              <Plus className="h-3.5 w-3.5" /> Create your first blog
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Blog</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Author</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Views</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {blogs.map(blog => (
                    <BlogRow
                      key={blog.id}
                      blog={blog}
                      isToggling={togglingId === blog.id}
                      onToggle={() => handleTogglePublish(blog)}
                      onDeleteClick={() => setConfirmDelete(blog)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Showing page {pagination.current} of {pagination.totalPages} ({pagination.count} total)
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.current <= 1}
                    onClick={() => handlePage(pagination.current - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePage(page)}
                        className={cn(
                          'w-7 h-7 rounded-lg text-xs font-semibold border transition-colors',
                          pagination.current === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    disabled={pagination.current >= pagination.totalPages}
                    onClick={() => handlePage(pagination.current + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">Delete Blog?</h3>
            <p className="text-sm text-gray-500 text-center mt-1 line-clamp-2">
              "{confirmDelete.title}" will be permanently deleted.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deletingId === confirmDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface BlogRowProps {
  blog: BlogListItem;
  isToggling: boolean;
  onToggle: () => void;
  onDeleteClick: () => void;
}

const BlogRow: React.FC<BlogRowProps> = ({ blog, isToggling, onToggle, onDeleteClick }) => {
  const isPublished = blog.status === 'published';

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      {/* Title + thumbnail */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {resolveMediaUrl(blog.image_thumbnail || blog.featured_image) ? (
            <img
              src={resolveMediaUrl(blog.image_thumbnail || blog.featured_image)!}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-gray-300" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate max-w-[220px]">{blog.title}</p>
            <p className="text-xs text-gray-400 font-mono truncate max-w-[220px]">/{blog.slug}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
          {blog.category_name || '—'}
        </span>
      </td>

      {/* Author */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-gray-600">{blog.author_name || '—'}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
            isPublished
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          )}>
            {isPublished ? (
              <><Globe className="h-3 w-3" /> Published</>
            ) : (
              <><Clock className="h-3 w-3" /> Draft</>
            )}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {blog.reading_time} min
        </p>
      </td>

      {/* Views */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Eye className="h-3.5 w-3.5 text-gray-400" />
          {blog.views_count.toLocaleString()}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {/* Publish Toggle */}
          <button
            onClick={onToggle}
            disabled={isToggling}
            title={isPublished ? 'Move to Draft' : 'Publish'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isPublished
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-100'
            )}
          >
            {isToggling
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : isPublished
              ? <ToggleRight className="h-4 w-4" />
              : <ToggleLeft className="h-4 w-4" />
            }
          </button>

          {/* Edit */}
          <Link
            to={`/blog/edit/${blog.id}`}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Link>

          {/* Delete */}
          <button
            onClick={onDeleteClick}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default BlogList;
