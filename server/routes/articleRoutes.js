
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAdminArticles,
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  getFeaturedArticles,
  getPopularArticles
} = require("../controllers/articleController");

// Admin-only listing includes drafts and scheduled articles.
router.get("/admin", protect, getAdminArticles);

// Public routes
router.get("/", getArticles);
router.get("/featured", getFeaturedArticles);
router.get("/popular", getPopularArticles);
router.get("/:slug", getArticleBySlug);

// Admin protected routes
router.post("/", protect, createArticle);
router.put("/:id", protect, updateArticle);
router.delete("/:id", protect, deleteArticle);

module.exports = router;
