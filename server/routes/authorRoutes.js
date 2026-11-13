const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor
} = require("../controllers/authorController");

router.get("/", getAuthors);
router.post("/", protect, createAuthor);
router.put("/:id", protect, updateAuthor);
router.delete("/:id", protect, deleteAuthor);

module.exports = router;