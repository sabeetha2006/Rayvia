const Tag = require("../models/Tag");

// Get all tags
exports.getTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tags.length,
      tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create tag
exports.createTag = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Tag name and slug are required"
      });
    }

    const tag = await Tag.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim()
    });

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      tag
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update tag
exports.updateTag = async (req, res) => {
  try {
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    res.json({
      success: true,
      message: "Tag updated successfully",
      tag
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete tag
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    res.json({
      success: true,
      message: "Tag deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};