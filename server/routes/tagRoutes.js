const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getTags,
  createTag,
  updateTag,
  deleteTag
} = require("../controllers/tagController");

router.get("/", getTags);
router.post("/", protect, createTag);
router.put("/:id", protect, updateTag);
router.delete("/:id", protect, deleteTag);

module.exports = router;