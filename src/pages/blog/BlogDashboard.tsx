import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Eye, CheckCircle, Edit3, TrendingUp,
  Plus, ArrowRight, Clock, BarChart3
} from 'lucide-react';
import { getBlogDashboard } from '../../services/blogApi';
import type { BlogDashboardStats, BlogListItem } from '../../types';
import { cn } from '../../utils/cn';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const BlogDashboard: React.FC = () => {
  const [stats, setStats] = useState<BlogDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Blogs',
      value: stats?.total_blogs ?? 0,
      icon: FileText,
      color: 'blue',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-blue-100',
    },
    {
      label: 'Published',
      value: stats?.published ?? 0,
      icon: CheckCircle,
      color: 'green',
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      border: 'border-green-100',
    },
    {
      label: 'Drafts',
      value: stats?.drafts ?? 0,
      icon: Edit3,
      color: 'amber',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      border: 'border-amber-100',
    },
    {
      label: 'Total Views',
      value: (stats?.total_views ?? 0).toLocaleString(),
      icon: Eye,
      color: 'purple',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      border: 'border-purple-100',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog CMS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your blog content, SEO and publishing</p>
        </div>
        <Link
          to="/blog/create"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Blog
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn('rounded-xl border p-4 flex items-center gap-4', card.bg, card.border)}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', card.iconBg)}>
                <Icon className={cn('h-5 w-5', card.iconColor)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/blog/create"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Plus className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Write New Blog</p>
            <p className="text-xs text-gray-500">Create and publish content</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-blue-500 transition-colors" />
        </Link>

        <Link
          to="/blog/list"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">All Blogs</p>
            <p className="text-xs text-gray-500">Manage existing posts</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-green-500 transition-colors" />
        </Link>

        <Link
          to="/blog/categories"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Categories & Tags</p>
            <p className="text-xs text-gray-500">Organise your content</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-purple-500 transition-colors" />
        </Link>
      </div>

      {/* Top Blogs */}
      {stats?.top_blogs && stats.top_blogs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Top Performing Blogs</h2>
            </div>
            <Link to="/blog/list" className="text-xs text-blue-600 hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.top_blogs.map((blog, idx) => (
              <TopBlogRow key={blog.id} blog={blog} rank={idx + 1} />
            ))}
          </div>
        </div>
      )}

      {stats?.total_blogs === 0 && (
        <EmptyBlogState />
      )}
    </div>
  );
};

const TopBlogRow: React.FC<{ blog: BlogListItem; rank: number }> = ({ blog, rank }) => (
  <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
      {rank}
    </span>
    {resolveMediaUrl(blog.image_thumbnail || blog.featured_image) ? (
      <img
        src={resolveMediaUrl(blog.image_thumbnail || blog.featured_image)!}
        alt={blog.title}
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
      />
    ) : (
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-gray-400" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 text-sm truncate">{blog.title}</p>
      <div className="flex items-center gap-3 mt-0.5">
        {blog.category_name && (
          <span className="text-xs text-gray-400">{blog.category_name}</span>
        )}
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {blog.reading_time} min read
        </span>
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 flex-shrink-0">
      <Eye className="h-3.5 w-3.5 text-gray-400" />
      {blog.views_count.toLocaleString()}
    </div>
    <Link
      to={`/blog/edit/${blog.id}`}
      className="text-xs text-blue-600 hover:underline flex-shrink-0 font-medium"
    >
      Edit
    </Link>
  </div>
);

const EmptyBlogState: React.FC = () => (
  <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
    <h3 className="font-semibold text-gray-700 text-lg">No blogs yet</h3>
    <p className="text-gray-500 text-sm mt-1">Start writing your first blog post to attract visitors and improve SEO.</p>
    <Link
      to="/blog/create"
      className="inline-flex items-center gap-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
    >
      <Plus className="h-4 w-4" />
      Write First Blog
    </Link>
  </div>
);

export default BlogDashboard;
