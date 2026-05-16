import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Tag, FolderOpen, ArrowLeft } from 'lucide-react';
import {
  getCategories, getTags, createCategory, createTag,
  deleteCategory, deleteTag
} from '../../services/blogApi';
import type { BlogCategory, BlogTag } from '../../types';

const BlogCategories: React.FC = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '', description: '', meta_title: '', meta_description: '' });
  const [newTagName, setNewTagName] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [savingTag, setSavingTag] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getTags()])
      .then(([cats, tgs]) => { setCategories(cats); setTags(tgs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAddCategory = async () => {
    if (!newCat.name.trim()) return;
    setSavingCat(true);
    try {
      const cat = await createCategory(newCat);
      setCategories(prev => [...prev, cat]);
      setNewCat({ name: '', description: '', meta_title: '', meta_description: '' });
    } catch (err) { console.error(err); }
    finally { setSavingCat(false); }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setSavingTag(true);
    try {
      const tag = await createTag(newTagName.trim());
      setTags(prev => [...prev, tag]);
      setNewTagName('');
    } catch (err) { console.error(err); }
    finally { setSavingTag(false); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category? Blogs using it will have no category.')) return;
    setDeletingCatId(id);
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeletingCatId(null); }
  };

  const handleDeleteTag = async (id: number) => {
    if (!window.confirm('Delete this tag?')) return;
    setDeletingTagId(id);
    try {
      await deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeletingTagId(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/blog" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories & Tags</h1>
          <p className="text-sm text-gray-500">Organise your blog content</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <FolderOpen className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-gray-900 text-sm">Categories ({categories.length})</h2>
          </div>

          {/* Add Form */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <input
              type="text"
              placeholder="Category name *"
              value={newCat.name}
              onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Meta title (optional)"
              value={newCat.meta_title}
              onChange={e => setNewCat(p => ({ ...p, meta_title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddCategory}
              disabled={savingCat || !newCat.name.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {savingCat ? 'Adding...' : 'Add Category'}
            </button>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No categories yet</p>
            ) : categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-400">/{cat.slug} · {cat.blog_count ?? 0} posts</p>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  disabled={deletingCatId === cat.id}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <Tag className="h-4 w-4 text-purple-600" />
            <h2 className="font-bold text-gray-900 text-sm">Tags ({tags.length})</h2>
          </div>

          {/* Add Form */}
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
            <input
              type="text"
              placeholder="Tag name..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              disabled={savingTag || !newTagName.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {savingTag ? '...' : <Plus className="h-4 w-4" />}
            </button>
          </div>

          {/* Tag Cloud */}
          <div className="px-4 py-3 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
            {tags.length === 0 ? (
              <p className="text-sm text-gray-400 w-full text-center py-6">No tags yet</p>
            ) : tags.map(tag => (
              <span key={tag.id} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700 group">
                {tag.name}
                {tag.blog_count !== undefined && (
                  <span className="text-gray-400">({tag.blog_count})</span>
                )}
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  disabled={deletingTagId === tag.id}
                  className="w-4 h-4 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogCategories;
