import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useState } from "react";

export function LoadingState({ label = "Loading content…" }) {
  return <div className="admin-loading"><LoaderCircle size={20} className="spin" />{label}</div>;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="admin-empty">
      <span className="empty-illustration"><ImagePlus size={22} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

const thumbnailPalettes = [
  { background: "#e5b94b", foreground: "#242724" },
  { background: "#d96b3b", foreground: "#fffaf0" },
  { background: "#e8eee8", foreground: "#173f35" },
  { background: "#dedbd1", foreground: "#242724" }
];

export function ArticleThumbnail({ article, articles = [] }) {
  const [imageError, setImageError] = useState(false);
  const index = articles.indexOf(article);
  const imageIsRepeated = Boolean(article.coverImage) && index > 0 && articles
    .slice(0, index)
    .some((candidate) => candidate.coverImage === article.coverImage);

  if (article.coverImage && !imageIsRepeated && !imageError) {
    return <span className="table-thumb"><img src={article.coverImage} alt="" onError={() => setImageError(true)} /></span>;
  }

  const seed = String(article.slug || article.title || article.category?.name || "RAYVIA")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const palette = thumbnailPalettes[seed % thumbnailPalettes.length];

  return (
    <span
      className="table-thumb article-thumbnail-placeholder"
      style={{
        "--thumbnail-background": palette.background,
        "--thumbnail-foreground": palette.foreground
      }}
      aria-label={`${article.category?.name || "Article"} image placeholder`}
      role="img"
    >
      {(article.category?.name || article.title || "R").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Delete", busy, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <button className="dialog-close" onClick={onCancel} aria-label="Close dialog" disabled={busy}><X size={18} /></button>
        <span className="confirm-icon">!</span>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="admin-button secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="admin-button danger" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

export function ImagePicker({ label, value, onChange, hint = "PNG, JPG or WebP · up to 2 MB" }) {
  const [error, setError] = useState("");

  const readImage = (file) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Images must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.onerror = () => setError("The selected image could not be read.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="field image-picker-field">
      <span className="field-label">{label}</span>
      <div className="image-picker">
        <label className="image-picker-button">
          <input type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
          {value ? <img src={value} alt="" /> : <span className="image-picker-placeholder"><ImagePlus size={20} /></span>}
          <span>{value ? "Change image" : "Choose image"}</span>
        </label>
        {value && <button type="button" className="image-remove" onClick={() => onChange("")}>Remove</button>}
        <small>{hint}</small>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
