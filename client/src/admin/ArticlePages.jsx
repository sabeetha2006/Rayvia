import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bold,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { adminApi, getApiError } from "../services/adminApi";
import { useAdmin } from "./adminContext.jsx";
import { ArticleThumbnail, ConfirmDialog, EmptyState, ImagePicker, LoadingState } from "./Components.jsx";

const pageSize = 10;

const formatDate = (date, includeTime = false) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {})
  });
};

const statusLabel = (status) => status ? `${status[0].toUpperCase()}${status.slice(1)}` : "Unknown";

const slugify = (value) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const toLocalDateTime = (value) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const defaultArticle = () => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  contentImages: [],
  category: "",
  author: "",
  tags: [],
  seoTitle: "",
  metaDescription: "",
  isFeatured: false,
  status: "draft",
  scheduledAt: ""
});

export function ArticlesPage() {
  const { resources } = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeSearch = searchParams.get("search") || "";
  const routeStatus = searchParams.get("status") || "";
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState(routeSearch);
  const [status, setStatus] = useState(routeStatus);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [previewArticle, setPreviewArticle] = useState(null);

  useEffect(() => {
    setSearch(routeSearch);
    setStatus(routeStatus);
    setPage(1);
  }, [routeSearch, routeStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await adminApi.listArticles({
          page,
          limit: pageSize,
          ...(query ? { search: query } : {}),
          ...(status ? { status } : {}),
          ...(category ? { category } : {})
        });
        if (!active) return;
        setArticles(response.articles || []);
        setTotal(response.totalArticles || 0);
        setTotalPages(response.totalPages || 0);
      } catch (loadError) {
        if (active) setError(getApiError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [page, query, status, category]);

  const removeArticle = async () => {
    setBusy(true);
    setError("");
    try {
      await adminApi.deleteArticle(deleteTarget._id);
      setDeleteTarget(null);
      if (articles.length === 1 && page > 1) setPage((current) => current - 1);
      else {
        const response = await adminApi.listArticles({
          page,
          limit: pageSize,
          ...(query ? { search: query } : {}),
          ...(status ? { status } : {}),
          ...(category ? { category } : {})
        });
        setArticles(response.articles || []);
        setTotal(response.totalArticles || 0);
        setTotalPages(response.totalPages || 0);
      }
    } catch (removeError) {
      setError(getApiError(removeError));
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set("status", value);
      else next.delete("status");
      return next;
    }, { replace: true });
  };

  return (
    <div className="admin-page articles-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">YOUR EDITORIAL PIPELINE</span><h2>Articles</h2><p>Write, review and manage every story in one place.</p></div>
        <Link className="admin-button primary" to="/admin/articles/new"><Plus size={17} /> New article</Link>
      </div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      <section className="panel article-list-panel">
        <div className="article-filterbar">
          <label className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by article title…" /></label>
          <label className="filter-select"><span>Status</span><select value={status} onChange={(event) => changeStatus(event.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select></label>
          <label className="filter-select"><span>Category</span><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{resources.categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
          {(search || status || category) && <button className="clear-filters" onClick={clearFilters}>Clear filters</button>}
        </div>
        {loading ? <LoadingState label="Loading your articles…" /> : articles.length ? (
          <>
            <div className="table-scroll">
              <table className="admin-table articles-table">
                <thead><tr><th>Article</th><th>Status</th><th>Category</th><th>Author</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{articles.map((article) => (
                  <tr key={article._id}>
                    <td><div className="article-table-title"><ArticleThumbnail article={article} articles={articles} /><span><strong>{article.title}</strong><small>/{article.slug}</small></span></div></td>
                    <td><span className={`status-pill status-${article.status}`}>{statusLabel(article.status)}</span>{article.status === "scheduled" && article.scheduledAt && <small className="schedule-subtext">{formatDate(article.scheduledAt, true)}</small>}</td>
                    <td>{article.category?.name || "—"}</td>
                    <td>{article.author?.name || "—"}</td>
                    <td>{formatDate(article.createdAt)}</td>
                    <td><div className="table-actions"><button title="Preview article" aria-label={`Preview ${article.title}`} onClick={() => setPreviewArticle(article)}><Eye size={15} /></button><button title="Edit article" aria-label={`Edit ${article.title}`} onClick={() => navigate(`/admin/articles/${article._id}/edit`, { state: { article } })}><Pencil size={15} /></button><button title="Delete article" aria-label={`Delete ${article.title}`} className="delete-action" onClick={() => setDeleteTarget(article)}><Trash2 size={15} /></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Showing <strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong> articles</span>
              <div><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} /></button><span>Page <strong>{page}</strong> of {totalPages || 1}</span><button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={17} /></button></div>
            </div>
          </>
        ) : (
          <EmptyState
            title={search || status || category ? "No articles match these filters" : "Your next story starts here"}
            description={search || status || category ? "Try changing or clearing the filters." : "Create your first article and start building your publication."}
            action={search || status || category
              ? <button className="admin-button secondary" onClick={clearFilters}>Clear filters</button>
              : <Link className="admin-button primary" to="/admin/articles/new"><Plus size={16} /> Create an article</Link>}
          />
        )}
      </section>
      {deleteTarget && <ConfirmDialog title="Delete this article?" message={`“${deleteTarget.title}” will be permanently deleted. This action cannot be undone.`} busy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={removeArticle} />}
      {previewArticle && <ArticlePreview article={previewArticle} onClose={() => setPreviewArticle(null)} />}
    </div>
  );
}

export function ArticleEditor() {
  const { id } = useParams();
  const { resources } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultArticle);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inlineImageError, setInlineImageError] = useState("");
  const contentRef = useRef(null);
  const inlineImageInput = useRef(null);

  useEffect(() => {
    if (!id) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await adminApi.listArticles({ id, page: 1, limit: 1 });
        const article = response.articles?.[0];
        if (!article) throw new Error("Article not found.");
        if (!active) return;
        setForm({
          title: article.title || "",
          slug: article.slug || "",
          excerpt: article.excerpt || "",
          content: article.content || "",
          coverImage: article.coverImage || "",
          contentImages: article.contentImages || [],
          category: article.category?._id || article.category || "",
          author: article.author?._id || article.author || "",
          tags: (article.tags || []).map((tag) => tag?._id || tag),
          seoTitle: article.seoTitle || "",
          metaDescription: article.metaDescription || "",
          isFeatured: Boolean(article.isFeatured),
          status: article.status || "draft",
          scheduledAt: article.scheduledAt ? toLocalDateTime(article.scheduledAt) : ""
        });
        setSlugTouched(true);
      } catch (loadError) {
        if (active) setError(getApiError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  const setField = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "title" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const toggleTag = (tagId) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tagId)
        ? current.tags.filter((value) => value !== tagId)
        : [...current.tags, tagId]
    }));
  };

  const insertMarkdown = (before, after = "", fallback = "text") => {
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? form.content.length;
    const end = textarea?.selectionEnd ?? form.content.length;
    const selected = form.content.slice(start, end) || fallback;
    const nextContent = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;
    setField("content", nextContent);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const cursor = start + before.length + selected.length + after.length;
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  const handleInlineImage = (file) => {
    setInlineImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setInlineImageError("Choose a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setInlineImageError("Inline images must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      setForm((current) => ({
        ...current,
        content: `${current.content}${current.content ? "\n\n" : ""}![Article image](${source})\n\n`
      }));
      setInlineImageError("");
    };
    reader.onerror = () => setInlineImageError("The selected image could not be read.");
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const selectedStatus = event.nativeEvent.submitter?.dataset?.status || form.status;
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setError("Add a title, slug, short description and article content before saving.");
      return;
    }
    if (!form.category || !form.author) {
      setError("Choose a category and author before saving.");
      return;
    }
    if (selectedStatus === "scheduled" && (!form.scheduledAt || new Date(form.scheduledAt) <= new Date())) {
      setError("Choose a future date and time for scheduled publication.");
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      slug: slugify(form.slug),
      excerpt: form.excerpt.trim(),
      category: form.category,
      author: form.author,
      tags: form.tags,
      status: selectedStatus,
      scheduledAt: selectedStatus === "scheduled" ? new Date(form.scheduledAt).toISOString() : null
    };

    if (new Blob([JSON.stringify(payload)]).size > 8 * 1024 * 1024) {
      setError("This article and its images exceed the 8 MB upload limit. Reduce the image sizes before saving.");
      return;
    }

    setSaving(true);
    try {
      if (id) await adminApi.updateArticle(id, payload);
      else await adminApi.createArticle(payload);
      navigate("/admin/articles", { replace: true });
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page"><LoadingState label="Loading article…" /></div>;

  return (
    <div className="admin-page editor-page">
      <div className="editor-topline">
        <button className="back-link" onClick={() => navigate("/admin/articles")}><ArrowLeft size={16} /> Back to articles</button>
        <span className={`status-pill status-${form.status}`}><span className="status-dot" />{statusLabel(form.status)}</span>
      </div>
      <div className="editor-heading">
        <div><span className="page-eyebrow">{id ? "EDITORIAL WORKSPACE" : "NEW STORY"}</span><h2>{id ? "Edit article" : "Create an article"}</h2><p>Shape your next story for the RAYVIA community.</p></div>
        <button type="button" className="admin-button secondary preview-button" onClick={() => setPreviewOpen(true)}><Eye size={16} /> Preview</button>
      </div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {resources.categories.length === 0 || resources.authors.length === 0 ? (
        <div className="admin-alert warning">Add at least one category and one author before creating an article. <Link to="/admin/categories">Manage content</Link>.</div>
      ) : null}
      <form className="article-editor-form" onSubmit={submit}>
        <div className="editor-main-column">
          <section className="panel editor-card">
            <div className="editor-section-head"><span className="section-index">01</span><div><h3>Story details</h3><p>Start with a clear title and a compelling introduction.</p></div></div>
            <label className="field full"><span>Article title <i>*</i></span><input autoFocus={!id} value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Give your story a clear, memorable title" maxLength={180} required /></label>
            <label className="field full"><span>URL slug <i>*</i></span><div className="slug-input"><span>rayvia.com/</span><input value={form.slug} onChange={(event) => { setSlugTouched(true); setField("slug", slugify(event.target.value)); }} placeholder="your-article-slug" required /></div><small>Generated from the title; you can customize it.</small></label>
            <label className="field full"><span>Short description <i>*</i></span><textarea rows={3} value={form.excerpt} onChange={(event) => setField("excerpt", event.target.value)} placeholder="Summarize what readers will learn in a sentence or two." maxLength={320} required /><small className="field-counter">{form.excerpt.length}/320</small></label>
          </section>

          <section className="panel editor-card content-editor-card">
            <div className="editor-section-head"><span className="section-index">02</span><div><h3>Article content</h3><p>Write in Markdown. Use the toolbar to format your story.</p></div></div>
            <div className="markdown-toolbar" role="toolbar" aria-label="Text formatting">
              <button type="button" title="Bold" onClick={() => insertMarkdown("**", "**")}><Bold size={16} /></button>
              <button type="button" title="Italic" onClick={() => insertMarkdown("*", "*")}><Italic size={16} /></button>
              <span />
              <button type="button" title="Heading" onClick={() => insertMarkdown("## ", "", "Section heading")}><strong>H</strong></button>
              <button type="button" title="Bulleted list" onClick={() => insertMarkdown("- ", "", "List item")}><List size={17} /></button>
              <button type="button" title="Numbered list" onClick={() => insertMarkdown("1. ", "", "List item")}><ListOrdered size={17} /></button>
              <button type="button" title="Quote" onClick={() => insertMarkdown("> ", "", "Quote")}><span className="quote-mark">“</span></button>
              <span />
              <button type="button" title="Insert link" onClick={() => insertMarkdown("[", "](https://)", "link text")}><ArrowUpRight size={16} /></button>
              <button type="button" title="Upload inline image" onClick={() => inlineImageInput.current?.click()}><ImagePlus size={16} /></button>
              <input ref={inlineImageInput} type="file" accept="image/*" className="sr-only" onChange={(event) => {
                handleInlineImage(event.target.files?.[0]);
                event.target.value = "";
              }} />
            </div>
            <textarea ref={contentRef} className="markdown-input" value={form.content} onChange={(event) => setField("content", event.target.value)} placeholder={"## Start with a strong opening\n\nTell your story here. Use Markdown to structure sections, add links and highlight key ideas."} required />
            <div className="editor-content-footer"><span>{form.content.trim() ? Math.max(1, Math.ceil(form.content.trim().split(/\s+/).length / 200)) : 0} min read</span><span>Markdown supported · 2 MB max per inline image</span></div>
            {inlineImageError && <p className="field-error">{inlineImageError}</p>}
          </section>
        </div>

        <aside className="editor-side-column">
          <section className="panel editor-card">
            <div className="editor-section-head compact"><span className="section-index">03</span><div><h3>Publication</h3><p>Set where and when your story goes live.</p></div></div>
            <label className="field"><span>Status</span><select value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label>
            {form.status === "scheduled" && <label className="field"><span>Publish date & time <i>*</i></span><input type="datetime-local" value={form.scheduledAt} onChange={(event) => setField("scheduledAt", event.target.value)} required /><small>Scheduled articles remain private until their publish time.</small></label>}
            <label className="field"><span>Category <i>*</i></span><select value={form.category} onChange={(event) => setField("category", event.target.value)} required><option value="">Select a category</option>{resources.categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
            <label className="field"><span>Author <i>*</i></span><select value={form.author} onChange={(event) => setField("author", event.target.value)} required><option value="">Select an author</option>{resources.authors.map((author) => <option key={author._id} value={author._id}>{author.name}</option>)}</select></label>
            <div className="field tags-field"><span className="field-label">Tags</span>{resources.tags.length ? <div className="tag-options">{resources.tags.map((tag) => <label key={tag._id} className={`tag-option${form.tags.includes(tag._id) ? " selected" : ""}`}><input type="checkbox" checked={form.tags.includes(tag._id)} onChange={() => toggleTag(tag._id)} /><span>{tag.name}</span>{form.tags.includes(tag._id) && <Check size={13} />}</label>)}</div> : <span className="field-hint">No tags yet. <Link to="/admin/tags">Add tags</Link>.</span>}</div>
          </section>

          <section className="panel editor-card">
            <div className="editor-section-head compact"><span className="section-index">04</span><div><h3>Featured image</h3><p>Give your story a visual home.</p></div></div>
            <ImagePicker label="Cover image" value={form.coverImage} onChange={(value) => setField("coverImage", value)} />
            {!form.coverImage && <label className="field image-url-field"><span>Or use an image URL</span><input type="url" value={form.coverImage} onChange={(event) => setField("coverImage", event.target.value)} placeholder="https://…" /></label>}
            {form.coverImage && <label className="field image-url-field"><span>Image URL</span><input type="url" value={form.coverImage.startsWith("data:") ? "" : form.coverImage} onChange={(event) => setField("coverImage", event.target.value)} placeholder="Use uploaded image or enter a URL" />{form.coverImage.startsWith("data:") && <small>Uploaded image is stored with this article.</small>}</label>}
            <label className="featured-toggle"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setField("isFeatured", event.target.checked)} /><span className="toggle-track" /><span><strong>Featured story</strong><small>Highlight this article on RAYVIA.</small></span></label>
          </section>

          <section className="panel editor-card seo-card">
            <div className="editor-section-head compact"><span className="section-index">05</span><div><h3>Search preview</h3><p>Help readers find this story.</p></div></div>
            <label className="field"><span>SEO title</span><input value={form.seoTitle} onChange={(event) => setField("seoTitle", event.target.value)} placeholder={form.title || "Search result title"} maxLength={70} /><small>{form.seoTitle.length}/70</small></label>
            <label className="field"><span>Meta description</span><textarea rows={3} value={form.metaDescription} onChange={(event) => setField("metaDescription", event.target.value)} placeholder={form.excerpt || "Search result description"} maxLength={160} /><small>{form.metaDescription.length}/160</small></label>
          </section>
        </aside>

        <div className="editor-actions-bar">
          <span>{id ? "Changes are saved to the current article." : "Your story is saved to RAYVIA when you submit."}</span>
          <div>
            <Link className="admin-button secondary" to="/admin/articles">Cancel</Link>
            <button className="admin-button secondary" type="submit" data-status="draft" disabled={saving}>
              {saving ? "Saving…" : "Save as draft"}
            </button>
            <button className="admin-button primary" type="submit" data-status="published" disabled={saving || !resources.categories.length || !resources.authors.length}>
              {saving ? <><LoaderCircle size={16} className="spin" /> Saving…</> : <><Check size={16} /> Publish now</>}
            </button>
            <button
              className={`admin-button${form.status === "scheduled" ? " primary" : " secondary"}`}
              type={form.status === "scheduled" ? "submit" : "button"}
              data-status="scheduled"
              onClick={form.status === "scheduled" ? undefined : () => setField("status", "scheduled")}
              disabled={saving || !resources.categories.length || !resources.authors.length}
            >
              {saving ? "Saving…" : <><CalendarDays size={15} /> {form.status === "scheduled" ? "Schedule article" : "Schedule publication"}</>}
            </button>
          </div>
        </div>
      </form>

      {previewOpen && <ArticlePreview article={form} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

export function ArticlePreview({ article, onClose }) {
  const category = useAdmin().resources.categories.find((item) => item._id === article.category);
  const author = useAdmin().resources.authors.find((item) => item._id === article.author);

  return (
    <div className="preview-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="article-preview-modal" role="dialog" aria-modal="true" aria-label="Article preview">
        <header className="preview-toolbar"><span><Eye size={16} /> Reader preview</span><button onClick={onClose} aria-label="Close preview"><X size={19} /></button></header>
        <div className="preview-scroll">
          <article className="reader-preview">
            {article.coverImage ? (
              <img className="reader-cover" src={article.coverImage} alt="" />
            ) : (
              <div className="reader-cover-placeholder" role="img" aria-label={`${category?.name || "Technology"} cover placeholder`}>
                <span>{category?.name || "Technology"}</span>
                <strong>{article.title || "Your next story"}</strong>
                <small>RAYVIA / FIELD NOTE</small>
              </div>
            )}
            <span className="reader-category">{category?.name || "Category"}</span>
            <h1>{article.title || "Your article title"}</h1>
            <p className="reader-excerpt">{article.excerpt || "Your article introduction will appear here."}</p>
            <div className="reader-byline"><span className="reader-avatar">{author?.profileImage ? <img src={author.profileImage} alt="" /> : author?.name?.slice(0, 1) || "R"}</span><span><strong>{author?.name || "Author name"}</strong><small>{author?.designation || "RAYVIA Editorial"}</small></span><span className="reader-readtime"><Clock3 size={14} /> {article.content.trim() ? Math.max(1, Math.ceil(article.content.trim().split(/\s+/).length / 200)) : 1} min read</span></div>
            <div className="reader-content"><ReactMarkdown>{article.content || "Your article content will appear in this preview."}</ReactMarkdown></div>
          </article>
        </div>
      </section>
    </div>
  );
}
