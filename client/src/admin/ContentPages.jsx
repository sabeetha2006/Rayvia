import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  FolderKanban,
  Plus,
  Search,
  Trash2,
  UsersRound
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi, getApiError } from "../services/adminApi";
import { useAdmin } from "./adminContext.jsx";
import { ArticleThumbnail, ConfirmDialog, EmptyState, ImagePicker, LoadingState } from "./Components.jsx";
import { ArticlePreview } from "./ArticlePages.jsx";

const formatDate = (date, options = { month: "short", day: "numeric", year: "numeric" }) =>
  date ? new Date(date).toLocaleDateString("en-US", options) : "—";

const statusLabel = (status) => status ? `${status[0].toUpperCase()}${status.slice(1)}` : "Unknown";
const emptyRows = [];

export function DashboardPage() {
  const { resources } = useAdmin();
  const [stats, setStats] = useState({ all: 0, published: 0, draft: 0, scheduled: 0 });
  const [recent, setRecent] = useState([]);
  const [chartRows, setChartRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewArticle, setPreviewArticle] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const removeArticle = async () => {
    setDeleting(true);
    setError("");
    try {
      await adminApi.deleteArticle(deleteTarget._id);
      setRecent((current) => current.filter((article) => article._id !== deleteTarget._id));
      setStats((current) => ({
        ...current,
        all: Math.max(0, current.all - 1),
        [deleteTarget.status]: Math.max(0, current[deleteTarget.status] - 1)
      }));
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(getApiError(deleteError));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const chartStart = new Date();
        chartStart.setDate(chartStart.getDate() - 6);
        chartStart.setHours(0, 0, 0, 0);
        const [all, published, draft, scheduled, chartPage, recentPage] = await Promise.all([
          adminApi.listArticles({ page: 1, limit: 1 }),
          adminApi.listArticles({ page: 1, limit: 1, status: "published" }),
          adminApi.listArticles({ page: 1, limit: 1, status: "draft" }),
          adminApi.listArticles({ page: 1, limit: 1, status: "scheduled" }),
          adminApi.listArticles({
            page: 1,
            limit: 50,
            status: "published",
            publishedAfter: chartStart.toISOString()
          }),
          adminApi.listArticles({ page: 1, limit: 6 })
        ]);
        if (!active) return;
        const rows = chartPage.articles || [];
        setStats({
          all: all.totalArticles || 0,
          published: published.totalArticles || 0,
          draft: draft.totalArticles || 0,
          scheduled: scheduled.totalArticles || 0
        });
        setRecent(recentPage.articles || []);
        const today = new Date();
        const week = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - index));
          date.setHours(0, 0, 0, 0);
          const next = new Date(date);
          next.setDate(date.getDate() + 1);
          return {
            date,
            label: date.toLocaleDateString("en-US", { weekday: "short" }),
            count: rows.filter((article) => {
              const publishedAt = article.publishedAt ? new Date(article.publishedAt) : null;
              return publishedAt && publishedAt >= date && publishedAt < next;
            }).length
          };
        });
        setChartRows(week);
      } catch (loadError) {
        if (active) setError(getApiError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const totalThisWeek = chartRows.reduce((total, row) => total + row.count, 0);
  const maxChartValue = Math.max(1, ...chartRows.map((row) => row.count));
  const cards = [
    { label: "Total articles", value: stats.all, icon: BookOpen, color: "forest", period: "All statuses", detail: "Across your publication" },
    { label: "Published", value: stats.published, icon: CheckCircle2, color: "orange", period: "Live", detail: "On your publication" },
    { label: "Draft articles", value: stats.draft, icon: FileText, color: "mustard", period: "In progress", detail: "Work in progress" },
    { label: "Scheduled", value: stats.scheduled, icon: CalendarClock, color: "charcoal", period: "Queued", detail: "Awaiting publication" },
    { label: "Categories", value: resources.categories.length, icon: FolderKanban, color: "ivory", period: "Topics", detail: "Editorial structure" },
    { label: "Authors", value: resources.authors.length, icon: UsersRound, color: "forest-alt", period: "Contributors", detail: "Writers and editors" }
  ];

  return (
    <div className="admin-page dashboard-page">
      <div className="page-intro dashboard-intro">
        <div><span className="page-eyebrow">PUBLICATION OVERVIEW</span><h2>Good to see you.</h2><p>Here’s what’s happening across your publication today.</p></div>
        <Link className="admin-button primary" to="/admin/articles/new"><Plus size={17} /> Create an article</Link>
      </div>

      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {loading ? <LoadingState label="Gathering your editorial stats…" /> : (
        <>
          <section className="stats-grid" aria-label="Publication statistics">
            {cards.map(({ label, value, icon: Icon, color, period, detail }) => (
              <article className={`stat-card stat-${color}`} key={label}>
                <div className="stat-top"><span className="stat-icon"><Icon size={18} /></span><span className="stat-period">{period}</span></div>
                <strong className="stat-value">{value.toLocaleString()}</strong>
                <span className="stat-label">{label}</span>
                <span className="stat-detail">{detail}</span>
              </article>
            ))}
          </section>

          <section className="quick-actions" aria-label="Quick actions">
            <span className="quick-actions-label">QUICK ACTIONS</span>
            <Link to="/admin/articles/new"><Plus size={16} /> Create new article <ArrowUpRight size={14} /></Link>
            <Link to="/admin/categories"><FolderKanban size={16} /> Manage categories <ArrowUpRight size={14} /></Link>
            <Link to="/admin/authors"><UsersRound size={16} /> Manage authors <ArrowUpRight size={14} /></Link>
            <Link to="/admin/articles?status=published"><BookOpen size={16} /> View published articles <ArrowUpRight size={14} /></Link>
          </section>

          <section className="dashboard-grid">
            <article className="panel publish-chart-panel">
              <div className="panel-heading">
                <div><span className="panel-kicker">PUBLISHING ACTIVITY</span><h3>Articles published</h3></div>
                <span className="chart-total">{totalThisWeek}<small> this week</small></span>
              </div>
              {totalThisWeek > 0 ? (
                <div className="bar-chart" role="img" aria-label={`Articles published per day this week. Total ${totalThisWeek}.`}>
                  {chartRows.map(({ label, count, date }) => (
                    <div className="chart-column" key={date.toISOString()}>
                      <div className="chart-bar-track"><span className={count ? "chart-bar has-value" : "chart-bar"} style={{ height: `${Math.max(4, (count / maxChartValue) * 100)}%` }} title={`${count} published`} /></div>
                      <span className="chart-day">{label}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="chart-empty no-activity">No articles were published in the last seven days, so there is no activity chart yet.</p>}
            </article>

            <article className="panel overview-panel">
              <div className="panel-heading"><div><span className="panel-kicker">YOUR PUBLICATION</span><h3>Workspace overview</h3></div></div>
              <div className="overview-list">
                <div><span className="overview-icon blue"><FolderKanban size={17} /></span><span>Categories</span><strong>{resources.categories.length}</strong></div>
                <div><span className="overview-icon violet"><UsersRound size={17} /></span><span>Authors</span><strong>{resources.authors.length}</strong></div>
                <div><span className="overview-icon green"><Clock3 size={17} /></span><span>Tags</span><strong>{resources.tags.length}</strong></div>
              </div>
              <Link to="/admin/categories" className="text-link">Manage your content <ArrowUpRight size={15} /></Link>
            </article>
          </section>

          <section className="panel recent-panel">
            <div className="panel-heading">
              <div><span className="panel-kicker">THE LATEST</span><h3>Recent articles</h3></div>
              <Link to="/admin/articles" className="text-link">View all articles <ArrowUpRight size={15} /></Link>
            </div>
            {recent.length ? (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead><tr><th>Article</th><th>Author</th><th>Category</th><th>Created</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>{recent.map((article) => (
                    <tr key={article._id}>
                      <td><div className="article-table-title"><ArticleThumbnail article={article} articles={recent} /><span><strong>{article.title}</strong><small>/{article.slug}</small></span></div></td>
                      <td>{article.author?.name || "—"}</td>
                      <td>{article.category?.name || "Uncategorized"}</td>
                      <td>{formatDate(article.createdAt)}</td>
                      <td><span className={`status-pill status-${article.status}`}>{statusLabel(article.status)}</span></td>
                      <td><div className="table-actions"><button title="Preview article" aria-label={`Preview ${article.title}`} onClick={() => setPreviewArticle(article)}><Eye size={15} /></button><Link className="row-action" to={`/admin/articles/${article._id}/edit`} aria-label={`Edit ${article.title}`}><ArrowUpRight size={16} /></Link><button title="Delete article" aria-label={`Delete ${article.title}`} className="delete-action" onClick={() => setDeleteTarget(article)}><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <EmptyState title="Your editorial slate is clear" description="Create your first article to start building your publication." action={<Link className="admin-button primary" to="/admin/articles/new"><Plus size={16} /> Create article</Link>} />}
          </section>

          <section className="activity-section">
            <div className="activity-heading"><span className="activity-heading-icon"><CalendarClock size={17} /></span><div><h3>Recent activity</h3><p>Updates to your editorial workspace</p></div></div>
            {recent.length ? <div className="activity-list">{recent.slice(0, 4).map((article, index) => (
              <div className="activity-item" key={article._id}>
                <span className={`activity-dot ${article.status}`} />
                <p><strong>{index === 0 ? "Updated" : "Edited"} “{article.title}”</strong><span>{formatDate(article.updatedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {statusLabel(article.status)}</span></p>
              </div>
            ))}</div> : <p className="activity-empty">Activity will appear here as your team works on stories.</p>}
          </section>
        </>
      )}
      {previewArticle && <ArticlePreview article={previewArticle} onClose={() => setPreviewArticle(null)} />}
      {deleteTarget && <ConfirmDialog title="Delete this article?" message={`“${deleteTarget.title}” will be permanently deleted. This action cannot be undone.`} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={removeArticle} />}
    </div>
  );
}

const resourceConfig = {
  categories: {
    title: "Categories",
    singular: "category",
    description: "Organize stories into clear topics for your readers.",
    fieldNames: ["name", "slug", "description", "image"],
    fields: [
      { name: "name", label: "Category name", required: true, placeholder: "e.g. Artificial Intelligence" },
      { name: "slug", label: "Slug", required: true, placeholder: "artificial-intelligence" },
      { name: "description", label: "Description", type: "textarea", placeholder: "A short introduction to this topic" }
    ]
  },
  authors: {
    title: "Authors",
    singular: "author",
    description: "Manage the people behind RAYVIA’s reporting and analysis.",
    fieldNames: ["name", "email", "profileImage", "designation", "bio"],
    fields: [
      { name: "name", label: "Full name", required: true, placeholder: "e.g. Jordan Lee" },
      { name: "email", label: "Email address", required: true, type: "email", placeholder: "jordan@rayvia.com" },
      { name: "designation", label: "Designation", placeholder: "e.g. Senior Technology Editor" },
      { name: "bio", label: "Short biography", type: "textarea", placeholder: "A few words about this author" }
    ]
  },
  tags: {
    title: "Tags",
    singular: "tag",
    description: "Add keywords that make related stories easier to discover.",
    fieldNames: ["name", "slug"],
    fields: [
      { name: "name", label: "Tag name", required: true, placeholder: "e.g. Machine learning" },
      { name: "slug", label: "Slug", required: true, placeholder: "machine-learning" }
    ]
  }
};

const resourceApi = {
  categories: { create: adminApi.createCategory, update: adminApi.updateCategory, remove: adminApi.deleteCategory },
  authors: { create: adminApi.createAuthor, update: adminApi.updateAuthor, remove: adminApi.deleteAuthor },
  tags: { create: adminApi.createTag, update: adminApi.updateTag, remove: adminApi.deleteTag }
};

const makeSlug = (value) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

export function ResourcePage({ type }) {
  const { resources, refreshResources } = useAdmin();
  const config = resourceConfig[type];
  const rows = resources[type] || emptyRows;
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => rows.filter((row) =>
    [row.name, row.slug, row.email, row.designation].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase())
    )
  ), [rows, search]);

  const openNew = () => {
    setEditing(null);
    setForm(Object.fromEntries(config.fieldNames.map((name) => [name, ""])));
    setImage("");
    setSlugTouched(false);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm(Object.fromEntries(config.fieldNames.map((name) => [name, row[name] || ""])));
    setImage(row.profileImage || row.image || "");
    setSlugTouched(true);
    setError("");
    setModalOpen(true);
  };

  const changeField = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "name" && (type === "categories" || type === "tags") && !slugTouched) {
        next.slug = makeSlug(value);
      }
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = { ...form };
    if (type === "authors") payload.profileImage = image;
    if (type === "categories") payload.image = image;
    if (type === "authors") payload.email = payload.email.trim().toLowerCase();
    if (type === "categories" || type === "tags") payload.slug = makeSlug(payload.slug);

    if (!payload.name?.trim()) {
      setError(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} name is required.`);
      return;
    }
    if ((type === "categories" || type === "tags") && !payload.slug) {
      setError("A valid slug is required.");
      return;
    }
    if (type === "authors" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setError("Enter a valid author email address.");
      return;
    }

    setBusy(true);
    try {
      if (editing) await resourceApi[type].update(editing._id, payload);
      else await resourceApi[type].create(payload);
      await refreshResources();
      setModalOpen(false);
      setNotice(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${editing ? "updated" : "created"} successfully.`);
      window.setTimeout(() => setNotice(""), 3500);
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await resourceApi[type].remove(deleteTarget._id);
      await refreshResources();
      setDeleteTarget(null);
      setNotice(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted.`);
      window.setTimeout(() => setNotice(""), 3500);
    } catch (deleteError) {
      setError(getApiError(deleteError));
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page resource-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">CONTENT STRUCTURE</span><h2>{config.title}</h2><p>{config.description}</p></div>
        <button className="admin-button primary" onClick={openNew}><Plus size={17} /> Add {config.singular}</button>
      </div>
      {notice && <div className="admin-alert success" role="status">{notice}</div>}
      {error && !modalOpen && <div className="admin-alert error" role="alert">{error}</div>}
      <section className="panel resource-panel">
        <div className="resource-toolbar">
          <div className="resource-count"><strong>{rows.length}</strong> {config.title.toLowerCase()} <span>in your workspace</span></div>
          <label className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} /></label>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table className="admin-table resource-table">
              <thead><tr><th>{type === "authors" ? "Author" : config.singular[0].toUpperCase() + config.singular.slice(1)}</th>{type === "authors" && <th>Designation</th>}<th>{type === "categories" ? "Description" : type === "authors" ? "Email address" : "Slug"}</th><th>Added</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{filtered.map((row) => (
                <tr key={row._id}>
                  <td><div className="resource-name-cell">{type === "authors" ? <span className="resource-avatar">{row.profileImage ? <img src={row.profileImage} alt="" /> : <UsersRound size={16} />}</span> : <span className={`resource-symbol resource-${type}`}>{type === "categories" ? <FolderKanban size={16} /> : <span>#</span>}</span>}<span><strong>{row.name}</strong>{type === "authors" && <small>{row.email}</small>}</span></div></td>
                  {type === "authors" && <td>{row.designation || "—"}</td>}
                  <td className="resource-secondary-cell">{type === "categories" ? row.description || "—" : type === "authors" ? row.email : <code>{row.slug}</code>}</td>
                  <td>{formatDate(row.createdAt, { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td><div className="row-controls"><button className="row-text-action" onClick={() => openEdit(row)}>Edit</button><button className="row-text-action delete" onClick={() => setDeleteTarget(row)}>Delete</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={search ? "No matching results" : `No ${config.title.toLowerCase()} yet`}
            description={search ? "Try another search term." : `Create your first ${config.singular} to organize your content.`}
            action={!search && <button className="admin-button primary" onClick={openNew}><Plus size={16} /> Add {config.singular}</button>}
          />
        )}
      </section>

      {modalOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setModalOpen(false);
        }}>
          <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title">
            <div className="form-dialog-head"><div><span className="page-eyebrow">{editing ? "EDIT CONTENT" : "NEW CONTENT"}</span><h2 id="resource-dialog-title">{editing ? `Edit ${config.singular}` : `Add ${config.singular}`}</h2></div><button className="dialog-close" onClick={() => setModalOpen(false)} aria-label="Close" disabled={busy}>×</button></div>
            <form className="admin-form" onSubmit={submit}>
              {config.fields.map((field) => (
                <label key={field.name} className={field.type === "textarea" ? "field full" : "field"}>
                  <span>{field.label}{field.required && <i> *</i>}</span>
                  {field.type === "textarea" ? <textarea rows={3} value={form[field.name] || ""} onChange={(event) => changeField(field.name, event.target.value)} placeholder={field.placeholder} /> : <input type={field.type || "text"} value={form[field.name] || ""} onChange={(event) => {
                    if (field.name === "slug") setSlugTouched(true);
                    changeField(field.name, event.target.value);
                  }} placeholder={field.placeholder} required={field.required} />}
                  {field.name === "slug" && <small>Used in public URLs; lowercase words separated by hyphens.</small>}
                </label>
              ))}
              {(type === "authors" || type === "categories") && <ImagePicker label={type === "authors" ? "Profile image" : "Category image"} value={image} onChange={setImage} />}
              {error && <div className="admin-alert error form-error" role="alert">{error}</div>}
              <div className="dialog-actions"><button type="button" className="admin-button secondary" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button><button className="admin-button primary" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : `Create ${config.singular}`}</button></div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && <ConfirmDialog title={`Delete ${config.singular}?`} message={`“${deleteTarget.name}” will be permanently removed. This action cannot be undone.`} busy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
    </div>
  );
}
