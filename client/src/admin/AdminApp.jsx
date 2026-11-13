import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Search,
  Settings,
  Tags,
  UsersRound
} from "lucide-react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
import { adminApi, getApiError } from "../services/adminApi";
import { ArticleEditor, ArticlesPage } from "./ArticlePages.jsx";
import { DashboardPage, ResourcePage } from "./ContentPages.jsx";
import { AdminContext, useAdmin } from "./adminContext.jsx";
import "./admin.css";

const navigation = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "All articles", path: "/admin/articles", icon: BookOpen },
  { label: "Create article", path: "/admin/articles/new", icon: FilePlus2 },
  { label: "Drafts", path: "/admin/articles?status=draft", status: "draft", icon: FileText },
  { label: "Scheduled", path: "/admin/articles?status=scheduled", status: "scheduled", icon: CalendarClock },
  { label: "Published", path: "/admin/articles?status=published", status: "published", icon: CheckCircle2 },
  { label: "Categories", path: "/admin/categories", icon: FolderKanban },
  { label: "Authors", path: "/admin/authors", icon: UsersRound },
  { label: "Tags", path: "/admin/tags", icon: Tags },
  { label: "Settings", path: "/admin/settings", icon: Settings }
];

const getInitials = (name = "Admin") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem("rayvia-admin-token"));
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [resources, setResources] = useState({ categories: [], authors: [], tags: [] });
  const [resourcesError, setResourcesError] = useState("");

  const refreshResources = useCallback(async () => {
    try {
      const [categoryData, authorData, tagData] = await Promise.all([
        adminApi.listCategories(),
        adminApi.listAuthors(),
        adminApi.listTags()
      ]);
      const next = {
        categories: categoryData.categories || [],
        authors: authorData.authors || [],
        tags: tagData.tags || []
      };
      setResources(next);
      setResourcesError("");
      return next;
    } catch (error) {
      setResourcesError(getApiError(error));
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      if (!token) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const response = await adminApi.profile();
        if (active) setProfile(response.admin);
        try {
          await refreshResources();
        } catch {
          // The authenticated session remains valid if a content list is unavailable.
        }
      } catch {
        sessionStorage.removeItem("rayvia-admin-token");
        if (active) {
          setToken(null);
          setProfile(null);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, [token, refreshResources]);

  const login = async (credentials) => {
    const response = await adminApi.login(credentials);
    if (!response.token) throw new Error("The API did not return an authentication token.");
    sessionStorage.setItem("rayvia-admin-token", response.token);
    setToken(response.token);
    setProfile(response.admin);
    setAuthReady(true);
    return response;
  };

  const logout = () => {
    sessionStorage.removeItem("rayvia-admin-token");
    setToken(null);
    setProfile(null);
    setResources({ categories: [], authors: [], tags: [] });
  };

  const value = useMemo(
    () => ({
      token,
      profile,
      resources,
      resourcesError,
      refreshResources,
      login,
      logout
    }),
    [token, profile, resources, resourcesError, refreshResources]
  );

  if (!authReady) {
    return (
      <div className="admin-boot-screen">
        <span className="admin-spinner" />
        <span>Checking your session…</span>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={value}>
      <Routes>
        <Route path="login" element={profile ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />} />
        <Route element={profile ? <AdminShell /> : <Navigate to="/admin/login" replace />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/new" element={<ArticleEditor key="new" />} />
          <Route path="articles/:id/edit" element={<ArticleEditor key="edit" />} />
          <Route path="categories" element={<ResourcePage type="categories" />} />
          <Route path="authors" element={<ResourcePage type="authors" />} />
          <Route path="tags" element={<ResourcePage type="tags" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={profile ? "/admin/dashboard" : "/admin/login"} replace />} />
      </Routes>
    </AdminContext.Provider>
  );
}

function LoginPage() {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      navigate("/admin/dashboard", { replace: true });
    } catch (loginError) {
      setError(getApiError(loginError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-aside">
        <a className="admin-brand login-brand" href="/">
          <span className="admin-brand-mark">R.</span>
          <span><strong>RAYVIA</strong><small>THE TECHNOLOGY CHRONICLE</small></span>
        </a>
        <div className="login-editorial">
          <span className="login-kicker">THE EDITORIAL DESK</span>
          <h1>Ideas worth sharing. Stories worth shaping.</h1>
          <p>One calm workspace to create, curate and publish the next great technology story.</p>
        </div>
        <div className="login-aside-foot">
          <span className="login-orbit"><BarChart3 size={21} /></span>
          <span>Thoughtful publishing, made simple.</span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="login-kicker">WELCOME BACK</span>
          <h2>Sign in to your desk</h2>
          <p className="login-subtitle">Use your administrator account to continue.</p>
          <form onSubmit={submit} className="admin-form login-form" noValidate>
            <label>
              Email address
              <input
                autoComplete="username"
                type="email"
                placeholder="you@rayvia.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((show) => !show)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
            {error && <div className="admin-alert error" role="alert">{error}</div>}
            <button className="admin-button primary login-submit" type="submit" disabled={busy}>
              {busy ? <><span className="button-spinner" /> Signing in…</> : <>Sign in <ArrowUpRight size={16} /></>}
            </button>
          </form>
          <div className="login-security"><span /> Secure administrator access</div>
        </div>
        <span className="login-copyright">© 2026 RAYVIA · Curiosity creates tomorrow.</span>
      </section>
    </main>
  );
}

function AdminShell() {
  const { profile, logout } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const activeStatus = new URLSearchParams(location.search).get("status");
  const currentNav = navigation.find((item) => {
    if (item.status) return location.pathname === "/admin/articles" && activeStatus === item.status;
    if (item.path === "/admin/articles") {
      return !activeStatus && (
        location.pathname === "/admin/articles" ||
        (location.pathname.startsWith("/admin/articles/") && location.pathname !== "/admin/articles/new")
      );
    }
    return item.path === location.pathname;
  });
  const title = currentNav?.label || "Admin workspace";
  const submitSearch = (event) => {
    event.preventDefault();
    const query = adminSearch.trim();
    navigate(query ? `/admin/articles?search=${encodeURIComponent(query)}` : "/admin/articles");
  };

  return (
    <div className="admin-app">
      {menuOpen && <button className="admin-sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar-top">
          <a className="admin-brand" href="/admin/dashboard">
            <span className="admin-brand-mark">R.</span>
            <span><strong>RAYVIA</strong><small>EDITORIAL DESK</small></span>
          </a>
          <span className="sidebar-edition">ADMINISTRATION</span>
        </div>
        <nav className="admin-navigation" aria-label="Admin navigation">
          <span className="nav-section-label">WORKSPACE</span>
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={`admin-nav-link${currentNav?.label === label ? " active" : ""}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {currentNav?.label === label && <span className="nav-active-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <span className="promo-icon"><PenLine size={17} /></span>
            <strong>Have a story in mind?</strong>
            <span>Turn your next idea into a great read.</span>
            <button onClick={() => { setMenuOpen(false); navigate("/admin/articles/new"); }}>Create a story <ArrowUpRight size={14} /></button>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
          <span className="sidebar-version">RAYVIA CMS <span>·</span> v1.0</span>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-title-group">
            <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="topbar-title">
              <span>WORKSPACE <span className="breadcrumb-divider">/</span> {title.toUpperCase()}</span>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <form className="topbar-search" onSubmit={submitSearch} role="search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search articles"
                placeholder="Search articles"
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
              />
            </form>
            <button className="topbar-create" onClick={() => navigate("/admin/articles/new")}>
              <FilePlus2 size={16} /> <span>New article</span>
            </button>
            <span className="topbar-divider" />
            <button className="topbar-profile" onClick={() => navigate("/admin/settings")} aria-label="Open account settings">
              <span className="avatar">{getInitials(profile?.name)}</span>
              <span className="topbar-profile-copy"><strong>{profile?.name || "Administrator"}</strong><small>Administrator</small></span>
              <ChevronDown size={15} />
            </button>
            <button className="topbar-logout" onClick={logout} aria-label="Sign out" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="admin-content"><Outlet /></main>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { profile, resourcesError, logout } = useAdmin();
  return (
    <div className="admin-page settings-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">YOUR WORKSPACE</span><h2>Settings</h2><p>Review your administrator account and CMS connection.</p></div>
      </div>
      <section className="settings-card">
        <div className="settings-card-head"><span className="settings-avatar">{getInitials(profile?.name)}</span><div><h3>Administrator profile</h3><p>Account information from your authenticated session.</p></div></div>
        <dl className="settings-details">
          <div><dt>Name</dt><dd>{profile?.name || "—"}</dd></div>
          <div><dt>Email</dt><dd>{profile?.email || "—"}</dd></div>
          <div><dt>Session</dt><dd><span className="connection-indicator" /> Active and verified</dd></div>
          <div><dt>API endpoint</dt><dd>{import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api"}</dd></div>
        </dl>
        <p className="settings-note">Authentication is kept for this browser session and cleared when you sign out.</p>
      </section>
      <section className="settings-card connection-card">
        <div className="settings-card-head"><span className="connection-icon"><BarChart3 size={18} /></span><div><h3>CMS connection</h3><p>Check that editorial content is available.</p></div></div>
        {resourcesError ? <div className="admin-alert error">{resourcesError}</div> : <div className="admin-alert success"><span className="connection-indicator" /> API connected. Categories, authors and tags are synchronized.</div>}
        <button className="admin-button secondary" onClick={logout}><LogOut size={16} /> Sign out of RAYVIA</button>
      </section>
    </div>
  );
}

export default AdminApp;
