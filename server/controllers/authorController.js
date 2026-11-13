const Author = require("../models/Author");

// Get all authors
exports.getAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: authors.length,
      authors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create author
exports.createAuthor = async (req, res) => {
  try {
    const { name, email, bio, profileImage, designation } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Author name and email are required"
      });
    }

    const existingAuthor = await Author.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingAuthor) {
      return res.status(400).json({
        success: false,
        message: "Author email already exists"
      });
    }

    const author = await Author.create({
      name,
      email: email.toLowerCase().trim(),
      bio,
      profileImage,
      designation
    });

    res.status(201).json({
      success: true,
      message: "Author created successfully",
      author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update author
exports.updateAuthor = async (req, res) => {
  try {
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "Author not found"
      });
    }

    res.json({
      success: true,
      message: "Author updated successfully",
      author
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete author
exports.deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findByIdAndDelete(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "Author not found"
      });
    }

    res.json({
      success: true,
      message: "Author deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};