import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Upload, Eye, EyeOff, Globe, Clock, X, Check
} from 'lucide-react';
import QuillEditor from '../../components/blog/QuillEditor';
import '../../components/blog/QuillEditor.css';
import {
  getBlog, createBlog, updateBlog, getCategories,
  getTags, createCategory, createTag
} from '../../services/blogApi';
import type { BlogFormData, BlogCategory, BlogTag, BlogSchemaType } from '../../types';
import { cn } from '../../utils/cn';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const SCHEMA_OPTIONS: { value: BlogSchemaType; label: string }[] = [
  { value: 'Article', label: 'Article' },
  { value: 'BlogPosting', label: 'Blog Posting' },
  { value: 'NewsArticle', label: 'News Article' },
  { value: 'FAQPage', label: 'FAQ Page' },
  { value: 'HowTo', label: 'How To' },
  { value: 'Service', label: 'Service' },
  { value: 'LocalBusiness', label: 'Local Business' },
  { value: 'Organization', label: 'Organization' },
  { value: 'WebPage', label: 'Web Page' },
  { value: 'BreadcrumbList', label: 'Breadcrumb List' },
  { value: 'Review', label: 'Review' },
  { value: 'Product', label: 'Product' },
  { value: 'QAPage', label: 'QA Page' },
  { value: 'VideoObject', label: 'Video Object' },
  { value: 'ImageObject', label: 'Image Object' },
];

/** SEO-friendly slug generation helper */
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

const BlogEditor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Form state
  const [form, setForm] = useState<BlogFormData>({
    title: '', slug: '', content: '', excerpt: '',
    featured_image: null,
    featured_image_alt: '', featured_image_title: '',
    meta_title: '', meta_description: '', target_keywords: '',
    canonical_url: '', schema_type: 'Article',
    og_title: '', og_description: '',
    status: 'published', category_id: null, tag_ids: [],
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<BlogTag[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [showPreview, setShowPreview] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    Promise.all([getCategories(), getTags()])
      .then(([cats, tgs]) => { setCategories(cats); setTags(tgs); })
      .catch(console.error);
  }, []);

  // Auto-generate slug from title while typing (only for new posts)
  useEffect(() => {
    if (!isSlugManuallyEdited && !isEdit) {
      set('slug', slugify(form.title));
    }
  }, [form.title, isSlugManuallyEdited, isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getBlog(Number(id))
      .then(blog => {
        setForm({
          title: blog.title,
          slug: blog.slug,
          content: blog.content,
          excerpt: blog.excerpt,
          featured_image: null,
          featured_image_alt: blog.featured_image_alt,
          featured_image_title: blog.featured_image_title,
          meta_title: blog.meta_title,
          meta_description: blog.meta_description,
          target_keywords: blog.target_keywords,
          canonical_url: blog.canonical_url,
          schema_type: blog.schema_type,
          og_title: blog.og_title,
          og_description: blog.og_description,
          status: blog.status,
          category_id: blog.category_detail?.id ?? null,
          tag_ids: blog.tags_detail?.map(t => t.id) ?? [],
        });
        setIsSlugManuallyEdited(true); // Treat existing posts as manually edited to prevent overwrite
        if (blog.featured_image) setExistingImageUrl(resolveMediaUrl(blog.featured_image));
        setSelectedTags((blog.tags_detail as BlogTag[]) ?? []);
      })
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, [id, isEdit]);

  const set = (key: keyof BlogFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10 MB.');
      return;
    }
    set('featured_image', file);
    setImagePreview(URL.createObjectURL(file));
  };


  const handleTagToggle = (tag: BlogTag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    const updated = isSelected ? selectedTags.filter(t => t.id !== tag.id) : [...selectedTags, tag];
    setSelectedTags(updated);
    set('tag_ids', updated.map(t => t.id));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const cat = await createCategory({ name: newCategoryName.trim() });
      setCategories(prev => [...prev, cat]);
      set('category_id', cat.id);
      setNewCategoryName('');
    } catch (err) { console.error(err); }
    finally { setAddingCategory(false); }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      const tag = await createTag(newTagName.trim());
      setTags(prev => [...prev, tag]);
      handleTagToggle(tag);
      setNewTagName('');
    } catch (err) { console.error(err); }
    finally { setAddingTag(false); }
  };

  const handleSave = async (statusOverride?: 'draft' | 'published') => {
    if (!form.title.trim()) { alert('Title is required'); return; }
    const contentText = form.content.replace(/<[^>]+>/g, '').trim();
    if (!contentText) { alert('Content is required'); return; }
    setSaving(true);
    setSaveMsg('');
    try {
      const payload: BlogFormData = {
        ...form,
        status: statusOverride || form.status,
      };
      if (isEdit && id) {
        await updateBlog(Number(id), payload);
        setSaveMsg('Saved!');
      } else {
        const blog = await createBlog(payload);
        setSaveMsg('Created!');
        setTimeout(() => navigate(`/blog/edit/${blog.id}`, { replace: true }), 800);
      }
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveMsg('Save failed — check console');
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/blog/list')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">
            {isEdit ? 'Edit Blog Post' : 'Create Blog Post'}
          </h1>
          {form.title.trim() ? (
            <p className="text-xs text-gray-500 truncate mt-0.5">{form.title}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Add title in the Content tab</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {saveMsg && (
            <span className={cn(
              'text-xs font-semibold px-2 py-1 rounded-full',
              saveMsg.includes('failed') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
            )}>
              {saveMsg}
            </span>
          )}

          {/* Status badge */}
          <span className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            form.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          )}>
            {form.status === 'published' ? 'Published' : 'Draft'}
          </span>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Preview
          </button>

          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Save Draft
          </button>

          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            Publish
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Main Editor Column */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2 pt-2">
            {(['content', 'seo'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-semibold rounded-t-lg capitalize transition-colors -mb-px',
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab === 'seo' ? 'SEO' : 'Content'}
              </button>
            ))}
          </div>

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 overflow-hidden">
              <div className="p-6 pb-4 space-y-4 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <label htmlFor="blog-title" className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Blog title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="blog-title"
                    type="text"
                    placeholder="e.g. How to Get Rid of Cockroaches in Mumbai"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-base font-semibold text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="blog-slug" className="block text-sm font-semibold text-gray-800 mb-1.5">
                    URL slug
                  </label>
                  <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
                      pestcontrol99.com/blog/
                    </span>
                    <input
                      id="blog-slug"
                      type="text"
                      value={form.slug}
                      onChange={e => {
                        setIsSlugManuallyEdited(true);
                        set('slug', slugify(e.target.value));
                      }}
                      placeholder="your-post-slug"
                      className="flex-1 min-w-0 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 border-0 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Auto-generated from title. Edit only if you need a custom URL.
                  </p>
                </div>
              </div>
              {showPreview ? (
                <article
                  className="blog-preview prose prose-sm max-w-none p-6 min-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              ) : (
                <div>
                  <p className="px-6 pt-4 pb-1 text-sm font-semibold text-gray-800">Blog body</p>
                  <QuillEditor
                    embedded
                    value={form.content}
                    onChange={html => set('content', html)}
                    placeholder="Start writing your blog content here..."
                  />
                </div>
              )}
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-6 space-y-5">
              <h3 className="font-bold text-gray-900 text-base">SEO & listing</h3>

              <h4 className="font-semibold text-gray-800 text-sm">Search engine (Google)</h4>

              {/* SEO Preview */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Google Preview</p>
                <p className="text-blue-700 text-base font-medium line-clamp-1">
                  {form.meta_title || form.title || 'Page Title'}
                </p>
                <p className="text-green-700 text-xs mt-0.5">
                  https://www.pestcontrol99.com/blog/{form.slug || 'your-slug'}/
                </p>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {form.meta_description || form.excerpt || 'Meta description will appear here...'}
                </p>
              </div>

              <SeoField label="Meta Title" maxLen={160} value={form.meta_title} onChange={v => set('meta_title', v)} placeholder="Page title for Google (max 60 chars recommended)" />
              <SeoField label="Meta Description" maxLen={320} value={form.meta_description} onChange={v => set('meta_description', v)} placeholder="Summary shown in search results (max 160 chars recommended)" textarea />
              <SeoField label="Target Keywords" value={form.target_keywords} onChange={v => set('target_keywords', v)} placeholder="cockroach control mumbai, pest control services, termite treatment" />
              <SeoField label="Canonical URL" value={form.canonical_url} onChange={v => set('canonical_url', v)} placeholder="https://www.pestcontrol99.com/blog/slug/ (leave blank to auto-generate)" />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Schema Type</label>
                <select
                  value={form.schema_type}
                  onChange={e => set('schema_type', e.target.value as BlogSchemaType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SCHEMA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <hr className="border-gray-100" />
              <h4 className="font-semibold text-gray-800 text-sm">Open Graph (Social Sharing)</h4>
              <SeoField label="OG Title" maxLen={200} value={form.og_title} onChange={v => set('og_title', v)} placeholder="Title for Facebook / WhatsApp sharing" />
              <SeoField label="OG Description" maxLen={400} value={form.og_description} onChange={v => set('og_description', v)} placeholder="Description for social sharing" textarea />

              <hr className="border-gray-200" />
              <h4 className="font-semibold text-gray-800 text-sm">Listing & publish</h4>

              <SeoField label="Excerpt" value={form.excerpt} onChange={v => set('excerpt', v)} placeholder="Short summary shown in blog listings and search previews..." textarea />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="flex gap-3">
                  {(['draft', 'published'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('status', s)}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg border text-sm font-semibold capitalize transition-all',
                        form.status === s
                          ? s === 'published'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4">

          {/* Featured Image */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Featured Image</h3>
            {(imagePreview || existingImageUrl) ? (
              <div className="relative group">
                <img
                  src={imagePreview || existingImageUrl!}
                  alt="Featured"
                  className="w-full aspect-video object-cover rounded-lg bg-gray-100"
                />
                <button
                  onClick={() => { setImagePreview(null); setExistingImageUrl(null); set('featured_image', null); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
              >
                <Upload className="h-6 w-6 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-medium">Click to upload</p>
                <p className="text-xs text-gray-300">JPG, PNG, WebP — max 10MB</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            {(imagePreview || existingImageUrl) && (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full text-xs text-blue-600 hover:underline font-medium"
              >
                Change image
              </button>
            )}
            <input
              type="text"
              placeholder="Image alt text (for SEO)"
              value={form.featured_image_alt}
              onChange={e => set('featured_image_alt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Category</h3>
            <select
              value={form.category_id || ''}
              onChange={e => set('category_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New category..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 disabled:opacity-50 transition-colors"
              >
                {addingCategory ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Tags</h3>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {tags.map(tag => {
                const isSelected = selectedTags.some(t => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag)}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium border transition-all',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    )}
                  >
                    {isSelected && <Check className="inline h-2.5 w-2.5 mr-1" />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New tag..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                disabled={addingTag || !newTagName.trim()}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 disabled:opacity-50 transition-colors"
              >
                {addingTag ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Reading Info */}
          {form.content && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Content Info</h3>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Words</span>
                <span className="font-semibold text-gray-700">
                  {form.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Read time</span>
                <span className="font-semibold text-gray-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.max(1, Math.round(form.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200))} min
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Meta title</span>
                <span className={cn('font-semibold', form.meta_title.length > 60 ? 'text-red-500' : 'text-gray-700')}>
                  {form.meta_title.length}/60
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Meta desc</span>
                <span className={cn('font-semibold', form.meta_description.length > 160 ? 'text-red-500' : 'text-gray-700')}>
                  {form.meta_description.length}/160
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

//â”€â”€â”€ SEO Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SeoFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  maxLen?: number;
}

const SeoField: React.FC<SeoFieldProps> = ({ label, value, onChange, placeholder, textarea, maxLen }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {maxLen && (
        <span className={cn('text-xs', value.length > maxLen * 0.9 ? 'text-red-500' : 'text-gray-400')}>
          {value.length}/{maxLen}
        </span>
      )}
    </div>
    {textarea ? (
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )}
  </div>
);

export default BlogEditor;
