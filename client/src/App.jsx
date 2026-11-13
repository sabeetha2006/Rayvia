
import { lazy, Suspense, useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Clock3,
  CalendarDays,
  BookOpen,
  UserRound
} from "lucide-react";
import "./App.css";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

const API = "http://localhost:5001/api";

const articleImages = {
  "future-of-web-development-2026":
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900",
  "generative-ai-digital-innovation":
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=900",
  "cybersecurity-protecting-digital-world-2026":
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900",
  "cloud-computing-scalable-digital-solutions-2026":
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900",
  "modern-mobile-app-development-trends-2026":
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900",
  "ui-ux-design-trends-2026":
    "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=900",
  "data-science-analytics-business-intelligence":
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900",
  "emerging-technology-trends-digital-world-2026":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900",
  "scalable-software-architecture-designing-systems":
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900",
  "technology-industry-insights-key-developments":
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900"
};

const getCategoryName = (article) => {
  return typeof article?.category === "object"
    ? article.category?.name || "Technology"
    : "Technology";
};

const getArticleImage = (article, articles = []) => {
  const image = article?.coverImage || articleImages[article?.slug] || "";
  if (!image) return "";

  const articleIndex = articles.indexOf(article);
  const alreadyUsed = articleIndex > 0 && articles
    .slice(0, articleIndex)
    .some((candidate) =>
      (candidate.coverImage || articleImages[candidate.slug] || "") === image
    );

  return alreadyUsed ? "" : image;
};

const placeholderThemes = [
  { background: "#e5b94b", foreground: "#242724" },
  { background: "#d96b3b", foreground: "#fffaf0" },
  { background: "#dce3d6", foreground: "#173f35" },
  { background: "#dedbd1", foreground: "#242724" }
];

function ArticlePhoto({ article, articles, className = "", loading = "lazy" }) {
  const [failed, setFailed] = useState(false);
  const source = getArticleImage(article, articles);

  if (!source || failed) {
    const category = article ? getCategoryName(article) : "RAYVIA JOURNAL";
    const seed = String(article?.slug || article?.title || category)
      .split("")
      .reduce((total, character) => total + character.charCodeAt(0), 0);
    const theme = placeholderThemes[seed % placeholderThemes.length];

    return (
      <div
        className={`article-photo-placeholder ${className}`}
        style={{
          "--placeholder-background": theme.background,
          "--placeholder-foreground": theme.foreground
        }}
        role="img"
        aria-label={`${category} editorial image placeholder`}
      >
        <span>{category}</span>
        <strong>{article?.title || "Ideas for a changing world"}</strong>
        <small>RAYVIA / FIELD NOTE</small>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={source}
      alt={article?.title || "RAYVIA technology story"}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}

const formatDate = (date) => {
  if (!date) return "Recently published";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

// Keep Markdown headings separated even when content has single line breaks.
const formatArticleContent = (content) => {
  return String(content || "Article content is not available.")
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");
};

function PublicSite() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAllArticles, setShowAllArticles] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articleRes, categoryRes] = await Promise.all([
          axios.get(`${API}/articles`),
          axios.get(`${API}/categories`)
        ]);

        setArticles(articleRes.data.articles || []);
        setCategories(categoryRes.data.categories || []);
      } catch (error) {
        console.error("Unable to load RAYVIA content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openArticle = (article) => {
    setSelectedArticle(article);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredArticles = articles.filter((article) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      article.title?.toLowerCase().includes(searchText) ||
      article.excerpt?.toLowerCase().includes(searchText) ||
      getCategoryName(article).toLowerCase().includes(searchText);

    const matchesCategory =
      activeCategory === "All" ||
      getCategoryName(article) === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles.filter(
    (article) => article.isFeatured
  );

  const heroArticle = featuredArticles[0] || articles[0];
  const supportingArticles = articles
    .filter((article) => article !== heroArticle)
    .slice(0, 2);
  const visibleArticles = showAllArticles
    ? filteredArticles
    : filteredArticles.slice(0, 6);
  const popularStories = articles.slice(0, 5);

  const closeMenu = () => setMenuOpen(false);

  // Individual article detail page
  if (selectedArticle) {
    const authorName =
      selectedArticle.author?.name || "RAYVIA Editorial Team";

    const authorDesignation =
      selectedArticle.author?.designation ||
      "Technology Editorial Team";

    return (
      <div className="rayvia">

        <header className="reading-header">
  <button
    className="article-back-button"
    onClick={closeArticle}
  >
    ← Back to all articles
  </button>
</header>

        <main className="article-detail-page">

          <div className="article-detail-header">

            <span className="article-category">
              {getCategoryName(selectedArticle)}
            </span>

            <h1>{selectedArticle.title}</h1>

            <p>{selectedArticle.excerpt}</p>

            <div className="article-meta">
              <span>
                <CalendarDays size={14} />
                {formatDate(selectedArticle.publishedAt)}
              </span>

              <span>
                <Clock3 size={14} />
                {selectedArticle.readingTime || 1} min read
              </span>
            </div>

            {/* Author Information */}
            <div className="article-author-card">
              <div className="author-avatar">
                <UserRound size={23} />
              </div>

              <div className="author-details">
                <small>WRITTEN BY</small>
                <strong>{authorName}</strong>
                <span>{authorDesignation}</span>
              </div>
            </div>

          </div>

          {/* Featured Image */}
          <ArticlePhoto
            article={selectedArticle}
            articles={articles}
            className="article-detail-image"
            loading="eager"
          />

          {/* Complete Article Content - Applies to Every Article */}
          <article className="article-full-content">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 className="article-main-heading">{children}</h2>
                ),

                h2: ({ children }) => (
                  <h2 className="article-main-heading">{children}</h2>
                ),

                h3: ({ children }) => (
                  <h3 className="article-sub-heading">{children}</h3>
                ),

                h4: ({ children }) => (
                  <h4 className="article-small-heading">{children}</h4>
                ),

                p: ({ children }) => <p>{children}</p>,

                ul: ({ children }) => <ul>{children}</ul>,

                ol: ({ children }) => <ol>{children}</ol>,

                li: ({ children }) => <li>{children}</li>,

                blockquote: ({ children }) => (
                  <blockquote>{children}</blockquote>
                ),

                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                ),

                pre: ({ children }) => <pre>{children}</pre>,

                code: ({ children, className }) => (
                  <code className={className}>{children}</code>
                ),

                hr: () => <hr />,

                strong: ({ children }) => <strong>{children}</strong>,

                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt || "Article image"}
                    loading="lazy"
                  />
                ),

                table: ({ children }) => (
                  <div className="article-table-wrapper">
                    <table>{children}</table>
                  </div>
                ),

                th: ({ children }) => <th>{children}</th>,

                td: ({ children }) => <td>{children}</td>
              }}
            >
              {formatArticleContent(selectedArticle.content)}
            </ReactMarkdown>
          </article>

          
{/* Article Footer */}
<div className="article-reading-footer">
  <p>Thank you for reading. Keep exploring new ideas.</p>

  <button
    className="article-back-button"
    onClick={closeArticle}
  >
    ← Explore more articles
  </button>
</div>


        </main>

        <footer className="footer">
          <div className="footer-bottom">
            <span>© 2026 RAYVIA. All rights reserved.</span>
            <span>Curiosity creates tomorrow.</span>
          </div>
        </footer>

      </div>
    );
  }

  return (
    <div className="rayvia">
      <header className="header">
        <a href="#home" className="brand" aria-label="RAYVIA home">
          <span className="brand-symbol">R.</span>
          <span>
            <strong>RAYVIA</strong>
            <small>THE TECHNOLOGY CHRONICLE</small>
          </span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Main navigation">
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#latest" onClick={closeMenu}>Discover</a>
          <a href="#topics" onClick={closeMenu}>Topics</a>
          <a href="#about" onClick={closeMenu}>About</a>
        </nav>

        <button
          className="header-search"
          aria-label="Search articles"
          onClick={() => {
            document.getElementById("latest")?.scrollIntoView({ behavior: "smooth" });
            document.getElementById("search-articles")?.focus({ preventScroll: true });
          }}
        >
          <Search size={19} />
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              INDEPENDENT TECHNOLOGY JOURNALISM
            </div>
            <h1>
              The future is
              <br />
              <span>worth a closer look.</span>
            </h1>
            <p className="hero-description">
              Thoughtful reporting and fresh perspectives on the ideas,
              people and technologies reshaping how we live.
            </p>
            <a href="#latest" className="hero-link">
              Read the latest <ArrowRight size={17} />
            </a>
            <div className="hero-edition">
              <span>THE RAYVIA EDITION</span>
              <span>VOL. 01 &nbsp;·&nbsp; 2026</span>
            </div>
          </div>

          <div className="hero-visual">
            <button
              className="hero-image-button"
              onClick={() => heroArticle && openArticle(heroArticle)}
              aria-label={heroArticle ? `Read ${heroArticle.title}` : "Featured technology story"}
              disabled={!heroArticle}
            >
              <ArticlePhoto article={heroArticle} articles={articles} loading="eager" />
            </button>
            <div className="hero-caption">
              <span className="article-category">
                {heroArticle ? getCategoryName(heroArticle) : "RAYVIA JOURNAL"}
              </span>
              <button
                className="hero-story-link"
                onClick={() => heroArticle && openArticle(heroArticle)}
                disabled={!heroArticle}
              >
                {heroArticle?.title || (loading ? "Gathering this week’s stories" : "The latest from RAYVIA")}
                <ArrowUpRight size={18} />
              </button>
              <span className="hero-caption-date">
                {heroArticle ? formatDate(heroArticle.publishedAt) : "Ideas for a changing world"}
              </span>
            </div>
          </div>
        </section>

        <section className="featured-section section" id="featured">
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE EDITORS’ SELECTION</span>
              <h2>Stories with a little more to say.</h2>
            </div>
            <span className="heading-note">A considered read, selected by our editors</span>
          </div>

          {heroArticle ? (
            <div className="editorial-grid">
              <article className="editorial-lead">
                <button
                  className="editorial-image editorial-image-lead"
                  onClick={() => openArticle(heroArticle)}
                  aria-label={`Read ${heroArticle.title}`}
                >
                  <ArticlePhoto article={heroArticle} articles={articles} loading="eager" />
                </button>
                <div className="editorial-copy">
                  <span className="article-category">{getCategoryName(heroArticle)}</span>
                  <h3>
                    <button onClick={() => openArticle(heroArticle)}>{heroArticle.title}</button>
                  </h3>
                  <p>{heroArticle.excerpt}</p>
                  <div className="editorial-byline">
                    <span>{heroArticle.author?.name || "RAYVIA Editorial Team"}</span>
                    <span>{formatDate(heroArticle.publishedAt)}</span>
                    <span>{heroArticle.readingTime || 1} min read</span>
                  </div>
                </div>
              </article>

              <div className="editorial-support">
                {supportingArticles.map((article, index) => (
                  <article className="support-story" key={article._id || article.slug}>
                    <button
                      className="editorial-image support-image"
                      onClick={() => openArticle(article)}
                      aria-label={`Read ${article.title}`}
                    >
                      <ArticlePhoto article={article} articles={articles} />
                    </button>
                    <div className="support-copy">
                      <span className="article-category">{getCategoryName(article)}</span>
                      <h3>
                        <button onClick={() => openArticle(article)}>{article.title}</button>
                      </h3>
                      <span className="support-reading-time">
                        {String(index + 2).padStart(2, "0")} &nbsp;·&nbsp; {article.readingTime || 1} min read
                      </span>
                    </div>
                  </article>
                ))}
                {supportingArticles.length === 0 && (
                  <p className="empty-message">
                    {loading ? "Loading more stories..." : "More editor-selected stories are on their way."}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-message">
              {loading ? "Loading featured stories..." : "Featured stories will appear here."}
            </p>
          )}
        </section>

        <section className="category-section section" id="topics">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FOLLOW YOUR CURIOSITY</span>
              <h2>Explore by topic.</h2>
            </div>
            <p className="heading-note">Different lenses on a world in motion</p>
          </div>
          <div className="topic-grid">
            <button
              className="topic-card topic-card-all"
              onClick={() => {
                setActiveCategory("All");
                document.getElementById("latest")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>01 / THE WHOLE PICTURE</span>
              <strong>All stories</strong>
              <ArrowUpRight size={20} />
            </button>
            {categories.map((category, index) => (
              <button
                key={category._id || category.name}
                className={`topic-card${activeCategory === category.name ? " topic-card-active" : ""}`}
                onClick={() => {
                  setActiveCategory(category.name);
                  document.getElementById("latest")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span>{String(index + 2).padStart(2, "0")} / FIELD NOTES</span>
                <strong>{category.name}</strong>
                <ArrowUpRight size={20} />
              </button>
            ))}
          </div>
          {categories.length === 0 && !loading && (
            <p className="topics-empty">New topics are being curated. Check back soon.</p>
          )}
        </section>

        <section className="latest-section section" id="latest">
          <div className="section-heading latest-heading">
            <div>
              <span className="section-kicker">FRESH OFF THE PRESS</span>
              <h2>Latest dispatches.</h2>
              <p>New ideas and considered perspectives from across technology.</p>
            </div>
            <div className="search-box">
              <Search size={18} aria-hidden="true" />
              <input
                id="search-articles"
                type="search"
                aria-label="Search articles"
                placeholder="Search the chronicle"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  Clear
                </button>
              )}
            </div>
          </div>

          {activeCategory !== "All" && (
            <div className="filter-status">
              <span>Browsing <strong>{activeCategory}</strong></span>
              <button onClick={() => setActiveCategory("All")}>Clear topic filter ×</button>
            </div>
          )}

          {loading ? (
            <div className="empty-message">Loading articles...</div>
          ) : filteredArticles.length > 0 ? (
            <>
              <div className="article-grid">
                {visibleArticles.map((article, index) => (
                  <article className={`article-card article-card-${index + 1}`} key={article._id || article.slug}>
                    <button
                      className="article-image"
                      onClick={() => openArticle(article)}
                      aria-label={`Read ${article.title}`}
                    >
                      <ArticlePhoto article={article} articles={articles} />
                    </button>
                    <div className="article-card-content">
                      <div className="article-card-overline">
                        <span className="article-category">{getCategoryName(article)}</span>
                        <span>{article.readingTime || 1} min read</span>
                      </div>
                      <h3>
                        <button onClick={() => openArticle(article)}>{article.title}</button>
                      </h3>
                      <p>{article.excerpt}</p>
                      <div className="article-card-footer">
                        <span>{article.author?.name || "RAYVIA Editorial Team"}</span>
                        <span>{formatDate(article.publishedAt)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {filteredArticles.length > 6 && (
                <button
                  className="view-all-link"
                  onClick={() => setShowAllArticles(!showAllArticles)}
                >
                  {showAllArticles ? "Show fewer articles" : "View all articles"}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          ) : (
            <div className="empty-message">
              <BookOpen size={30} />
              <h3>No articles found</h3>
              <p>Try another keyword or topic.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
              >
                View all articles
              </button>
            </div>
          )}
        </section>

        <section className="popular-section section" id="popular">
          <div className="popular-intro">
            <span className="section-kicker">READERS ARE TALKING</span>
            <h2>Most read,<br />most thought about.</h2>
            <p>The stories readers are spending time with this week.</p>
          </div>
          <ol className="popular-list">
            {popularStories.map((article, index) => (
              <li key={article._id || article.slug}>
                <span className="popular-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <span className="article-category">{getCategoryName(article)}</span>
                  <button onClick={() => openArticle(article)}>{article.title}</button>
                </div>
                <span className="popular-time">{article.readingTime || 1} min</span>
              </li>
            ))}
            {popularStories.length === 0 && (
              <li className="popular-empty">{loading ? "Gathering the most-read stories..." : "Popular stories will appear here."}</li>
            )}
          </ol>
        </section>

        <section className="newsletter" id="about">
          <div>
            <span className="section-kicker">A NOTE FROM THE EDITORS</span>
            <h2>Technology moves fast.<br />Understanding takes time.</h2>
            <p>RAYVIA is an independent chronicle for the endlessly curious.</p>
          </div>
          <a href="#latest" className="newsletter-button">
            Spend a little time here <ArrowRight size={17} />
          </a>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <a href="#home" className="brand footer-brand">
              <span className="brand-symbol">R.</span>
              <span>
                <strong>RAYVIA</strong>
                <small>THE TECHNOLOGY CHRONICLE</small>
              </span>
            </a>
            <p>Independent perspectives on the technologies shaping tomorrow.</p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <a href="#home">Home</a>
            <a href="#latest">Discover</a>
            <a href="#topics">Topics</a>
            <a href="#about">About</a>
          </nav>
          <div className="footer-social">
            <span>FOLLOW ALONG</span>
            <a href="https://www.instagram.com/" aria-label="Instagram">Instagram <ArrowUpRight size={14} /></a>
            <a href="https://www.linkedin.com/" aria-label="LinkedIn">LinkedIn <ArrowUpRight size={14} /></a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 RAYVIA. All rights reserved.</span>
          <a href="#home" className="back-top">Back to top ↑</a>
          <span>Curiosity creates tomorrow.</span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<div className="admin-boot-screen">Loading RAYVIA Admin…</div>}><AdminApp /></Suspense>} />
        <Route path="*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
