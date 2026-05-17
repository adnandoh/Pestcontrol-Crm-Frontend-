import React, { useEffect, useRef, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { uploadBlogImage } from '../../services/blogApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import './QuillEditor.css';

/** Quill can strip/block image URLs during insertEmbed — keep https URLs intact. */
const ImageFormat = Quill.import('formats/image') as {
  sanitize?: (url: string) => string;
};
if (ImageFormat?.sanitize) {
  const defaultSanitize = ImageFormat.sanitize.bind(ImageFormat);
  ImageFormat.sanitize = (url: string) => {
    const trimmed = (url || '').trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    try {
      return defaultSanitize(trimmed);
    } catch {
      return trimmed;
    }
  };
}

const MAX_IMAGE_MB = 10;

function insertEditorImage(quill: Quill, imageUrl: string, altText = '') {
  const url = imageUrl.trim();
  if (!url) return;

  const range = quill.getSelection(true);
  const index = range?.index ?? Math.max(0, quill.getLength() - 1);

  quill.insertEmbed(index, 'image', url, Quill.sources.USER);

  requestAnimationFrame(() => {
    const imgs = quill.root.querySelectorAll('img');
    const target = imgs[imgs.length - 1];
    if (target && (!target.getAttribute('src') || target.getAttribute('src') === '')) {
      target.setAttribute('src', url);
    }
    if (target && altText) {
      target.setAttribute('alt', altText);
    }
    quill.setSelection(index + 1, 0, Quill.sources.SILENT);
  });
}

const FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list',
  'blockquote', 'code-block',
  'link', 'image', 'video',
  'align',
  'indent',
];

export interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  embedded?: boolean;
}

function normalizeHtml(html: string) {
  if (!html || html === '<p><br></p>') return '';
  return html;
}

/** Remove all Quill-generated DOM (toolbar is a sibling, not inside the host). */
function destroyQuillMount(el: HTMLElement) {
  el.innerHTML = '';
  el.classList.remove('ql-container', 'ql-snow', 'ql-disabled');
  el.removeAttribute('contenteditable');
}

const QuillEditor: React.FC<QuillEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing your blog content here...',
  readOnly = false,
  className = '',
  embedded = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const placeholderRef = useRef(placeholder);
  const isToolbarFixedRef = useRef(false);
  const initialValueRef = useRef(value);

  onChangeRef.current = onChange;
  placeholderRef.current = placeholder;

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        alert(`Image must be under ${MAX_IMAGE_MB}MB.`);
        return;
      }

      try {
        const result = await uploadBlogImage(file);
        const url = resolveMediaUrl(result.url) || result.url;
        if (!url) {
          alert('Upload succeeded but no image URL was returned.');
          return;
        }
        const quill = quillRef.current;
        if (!quill) return;
        insertEditorImage(quill, url, result.alt_text || '');
      } catch (err: unknown) {
        console.error('Image upload failed:', err);
        const ax = err as { response?: { data?: { error?: string; image?: string[] } } };
        const msg =
          ax?.response?.data?.error ||
          ax?.response?.data?.image?.[0] ||
          'Failed to upload image.';
        alert(typeof msg === 'string' ? msg : 'Failed to upload image.');
      }
    };
    input.click();
  }, []);

  const videoHandler = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const url = window.prompt('Enter YouTube URL (e.g. https://youtu.be/VIDEO_ID):');
    if (!url) return;

    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    );
    if (!match) {
      alert('Invalid YouTube URL');
      return;
    }

    const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
    const range = quill.getSelection(true);
    const index = range?.index ?? Math.max(0, quill.getLength() - 1);
    quill.clipboard.dangerouslyPasteHTML(
      `<p><br></p><div class="video-embed"><iframe src="${embedUrl}" allowfullscreen></iframe></div><p><br></p>`,
      'user',
    );
    quill.setSelection(index + 1);
  }, []);

  const imageHandlerRef = useRef(imageHandler);
  const videoHandlerRef = useRef(videoHandler);
  imageHandlerRef.current = imageHandler;
  videoHandlerRef.current = videoHandler;

  // Initialize Quill once per mount (Strict Mode safe)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    destroyQuillMount(el);

    const quill = new Quill(el, {
      theme: 'snow',
      placeholder: placeholderRef.current,
      readOnly,
      formats: FORMATS,
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ indent: '-1' }, { indent: '+1' }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            [{ align: [] }],
            ['clean'],
          ],
          handlers: {
            image: () => imageHandlerRef.current(),
            video: () => videoHandlerRef.current(),
          },
        },
        clipboard: { matchVisual: false },
      },
    });

    const onTextChange = () => {
      onChangeRef.current(quill.root.innerHTML);
    };
    quill.on('text-change', onTextChange);

    const initial = initialValueRef.current;
    if (initial) {
      quill.clipboard.dangerouslyPasteHTML(initial, 'silent');
    }

    quillRef.current = quill;

    let isPasting = false;
    let isToolbarAction = false;
    let pasteTimeout: ReturnType<typeof setTimeout>;
    let toolbarActionTimeout: ReturnType<typeof setTimeout>;
    let savedScrollY = 0;

    const getToolbar = () => el.querySelector('.ql-toolbar') as HTMLElement | null;

    const handleScroll = () => {
      if (isPasting || isToolbarAction) return;
      const toolbar = getToolbar();
      if (!toolbar) return;

      const rect = el.getBoundingClientRect();
      const toolbarHeight = toolbar.offsetHeight || 48;
      const headerOffset = 56;
      const inView = rect.top <= headerOffset && rect.bottom > toolbarHeight + headerOffset;

      if (inView && !isToolbarFixedRef.current) {
        toolbar.classList.add('toolbar-fixed');
        isToolbarFixedRef.current = true;
      } else if (!inView && isToolbarFixedRef.current) {
        toolbar.classList.remove('toolbar-fixed');
        isToolbarFixedRef.current = false;
      }
    };

    const handlePasteStart = () => {
      isPasting = true;
      savedScrollY = window.scrollY;
      clearTimeout(pasteTimeout);
      pasteTimeout = setTimeout(() => {
        isPasting = false;
        if (Math.abs(window.scrollY - savedScrollY) > 10) {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
        }
      }, 2000);
    };

    const handleToolbarActionStart = () => {
      isToolbarAction = true;
      savedScrollY = window.scrollY;
      clearTimeout(toolbarActionTimeout);
      toolbarActionTimeout = setTimeout(() => {
        isToolbarAction = false;
        if (Math.abs(window.scrollY - savedScrollY) > 5) {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
        }
      }, 300);
    };

    const editorEl = quill.root;
    editorEl.addEventListener('paste', handlePasteStart);

    const toolbar = getToolbar();
    toolbar?.addEventListener('mousedown', handleToolbarActionStart);
    toolbar?.addEventListener('click', handleToolbarActionStart);

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (target && toolbar?.contains(target)) {
        handleToolbarActionStart();
      }
    };

    el.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      el.removeEventListener('focusin', handleFocusIn, true);
      editorEl.removeEventListener('paste', handlePasteStart);
      toolbar?.removeEventListener('mousedown', handleToolbarActionStart);
      toolbar?.removeEventListener('click', handleToolbarActionStart);
      clearTimeout(pasteTimeout);
      clearTimeout(toolbarActionTimeout);
      quill.off('text-change', onTextChange);
      quillRef.current = null;
      isToolbarFixedRef.current = false;
      destroyQuillMount(el);
    };
  }, []);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const current = normalizeHtml(quill.root.innerHTML);
    const next = normalizeHtml(value || '');
    if (current === next) return;

    const sel = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(value || '', 'silent');
    if (sel) {
      quill.setSelection(sel);
    }
  }, [value]);

  useEffect(() => {
    quillRef.current?.enable(!readOnly);
  }, [readOnly]);

  return (
    <div
      ref={rootRef}
      className={`quill-editor-root ${embedded ? 'quill-embedded' : ''} ${readOnly ? 'ql-readonly' : ''} ${className}`.trim()}
    />
  );
};

export default QuillEditor;
