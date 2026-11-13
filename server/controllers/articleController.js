
const Article = require("../models/Article");
const Category = require("../models/Category");
const Author = require("../models/Author");
const Tag = require("../models/Tag");

// Admin listing is separate from the public listing so drafts and scheduled
// articles never become visible through the public API.
exports.getAdminArticles = async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      id,
      publishedAfter,
      page = 1,
      limit = 10
    } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const filter = {};

    if (status) {
      if (!["draft", "published", "scheduled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid article status"
        });
      }

      filter.status = status;
    }

    if (category) {
      if (!Article.db.base.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category"
        });
      }

      filter.category = category;
    }

    if (id) {
      if (!Article.db.base.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid article id"
        });
      }

      filter._id = id;
    }

    if (publishedAfter) {
      const startDate = new Date(publishedAfter);
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid publication date filter"
        });
      }

      filter.publishedAt = { $gte: startDate };
    }

    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: escapedSearch, $options: "i" };
    }

    const totalArticles = await Article.countDocuments(filter);
    const articles = await Article.find(filter)
      .populate("category", "name slug")
      .populate("author", "name designation profileImage")
      .populate("tags", "name slug")
      .sort({ updatedAt: -1 })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    res.json({
      success: true,
      totalArticles,
      totalPages: Math.ceil(totalArticles / pageLimit),
      currentPage,
      articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL ARTICLES - Search, filter and pagination
exports.getArticles = async (req, res) => {
  try {
    const {
      search,
      category,
      page = 1,
      limit = 9
    } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(50, Math.max(1, Number(limit) || 9));

    const filter = {
      status: "published",
      $or: [
        { publishedAt: null },
        { publishedAt: { $lte: new Date() } }
      ]
    };

    if (category) {
      const categoryQuery = Category.findOne({
        slug: category
      });

      const categoryDoc = /^[0-9a-fA-F]{24}$/.test(category)
        ? await Category.findById(category)
        : await categoryQuery;

      if (!categoryDoc) {
        return res.json({
          success: true,
          articles: [],
          totalArticles: 0,
          totalPages: 0,
          currentPage
        });
      }

      filter.category = categoryDoc._id;
    }

    if (search) {
      const matchingTags = await Tag.find({
        name: { $regex: search, $options: "i" }
      }).select("_id");

      filter.$and = [{
        $or: [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: matchingTags.map(tag => tag._id) } }
        ]
      }];
    }

    const totalArticles = await Article.countDocuments(filter);

    const articles = await Article.find(filter)
      .populate("category", "name slug")
      .populate("author", "name designation profileImage")
      .populate("tags", "name slug")
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    res.json({
      success: true,
      totalArticles,
      totalPages: Math.ceil(totalArticles / pageLimit),
      currentPage,
      articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET SINGLE ARTICLE BY SLUG
exports.getArticleBySlug = async (req, res) => {
  try {
    const article = await Article.findOne({
      slug: req.params.slug,
      status: "published",
      $or: [
        { publishedAt: null },
        { publishedAt: { $lte: new Date() } }
      ]
    })
      .populate("category", "name slug")
      .populate("author", "name bio designation profileImage")
      .populate("tags", "name slug");

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    // Increase article views
    await Article.findByIdAndUpdate(article._id, {
      $inc: { views: 1 }
    });

    // Related articles
    const relatedArticles = await Article.find({
      _id: { $ne: article._id },
      category: article.category?._id,
      status: "published",
      $or: [
        { publishedAt: null },
        { publishedAt: { $lte: new Date() } }
      ]
    })
      .populate("category", "name slug")
      .populate("author", "name")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(3);

    // Previous article
    const previousArticle = await Article.findOne({
      status: "published",
      publishedAt: { $lt: article.publishedAt },
      _id: { $ne: article._id }
    })
      .sort({ publishedAt: -1 })
      .select("title slug");

    // Next article
    const nextArticle = await Article.findOne({
      status: "published",
      publishedAt: { $gt: article.publishedAt }
    })
      .sort({ publishedAt: 1 })
      .select("title slug");

    res.json({
      success: true,
      article,
      relatedArticles,
      previousArticle,
      nextArticle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// CREATE ARTICLE
exports.createArticle = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      contentImages,
      category,
      author,
      tags,
      status,
      scheduledAt,
      isFeatured,
      seoTitle,
      metaDescription
    } = req.body;

    if (!title || !slug || !excerpt || !content || !category || !author) {
      return res.status(400).json({
        success: false,
        message: "Title, slug, excerpt, content, category and author are required"
      });
    }

    const cleanSlug = slug.toLowerCase().trim();

    const existingArticle = await Article.findOne({
      slug: cleanSlug
    });

    if (existingArticle) {
      return res.status(400).json({
        success: false,
        message: "Article slug already exists"
      });
    }

    const categoryExists = await Category.findById(category);

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid category"
      });
    }

    const authorExists = await Author.findById(author);

    if (!authorExists) {
      return res.status(400).json({
        success: false,
        message: "Valid author is required"
      });
    }

    // Validate tags
    const tagIds = tags || [];

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({
        success: false,
        message: "Tags must be an array"
      });
    }

    if (tagIds.length > 0) {
      const validTags = await Tag.countDocuments({
        _id: { $in: tagIds }
      });

      if (validTags !== tagIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more tags are invalid"
        });
      }
    }

    const articleStatus = status || "draft";

    if (!["draft", "published", "scheduled"].includes(articleStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article status"
      });
    }

    if (
      articleStatus === "scheduled" &&
      (!scheduledAt ||
        Number.isNaN(new Date(scheduledAt).getTime()) ||
        new Date(scheduledAt) <= new Date())
    ) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date must be in the future"
      });
    }

    const article = await Article.create({
      title,
      slug: cleanSlug,
      excerpt,
      content,
      coverImage,
      contentImages: contentImages || [],
      category,
      author,
      tags: tagIds,
      status: articleStatus,
      scheduledAt: articleStatus === "scheduled" ? scheduledAt : null,
      publishedAt: articleStatus === "published" ? new Date() : null,
      isFeatured: isFeatured || false,
      readingTime: Math.max(
        1,
        Math.ceil(content.trim().split(/\s+/).length / 200)
      ),
      seoTitle,
      metaDescription
    });

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      article
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE ARTICLE
exports.updateArticle = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.slug) {
      updates.slug = updates.slug.toLowerCase().trim();

      const duplicate = await Article.findOne({
        slug: updates.slug,
        _id: { $ne: req.params.id }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists"
        });
      }
    }

    if (updates.category) {
      const categoryExists = await Category.findById(updates.category);

      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid category"
        });
      }
    }

    if (updates.author) {
      const authorExists = await Author.findById(updates.author);

      if (!authorExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid author"
        });
      }
    }

    if (updates.tags) {
      if (!Array.isArray(updates.tags)) {
        return res.status(400).json({
          success: false,
          message: "Tags must be an array"
        });
      }

      const validTags = await Tag.countDocuments({
        _id: { $in: updates.tags }
      });

      if (validTags !== updates.tags.length) {
        return res.status(400).json({
          success: false,
          message: "One or more tags are invalid"
        });
      }
    }

    if (updates.content) {
      updates.readingTime = Math.max(
        1,
        Math.ceil(updates.content.trim().split(/\s+/).length / 200)
      );
    }

    if (updates.status === "published") {
      updates.publishedAt = new Date();
      updates.scheduledAt = null;
    }

    if (updates.status === "draft") {
      updates.publishedAt = null;
      updates.scheduledAt = null;
    }

    if (updates.status === "scheduled") {
      if (
        !updates.scheduledAt ||
        Number.isNaN(new Date(updates.scheduledAt).getTime()) ||
        new Date(updates.scheduledAt) <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Choose a future scheduled date"
        });
      }

      updates.publishedAt = null;
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    res.json({
      success: true,
      message: "Article updated successfully",
      article
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE ARTICLE
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    res.json({
      success: true,
      message: "Article deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET FEATURED ARTICLES
exports.getFeaturedArticles = async (req, res) => {
  try {
    const articles = await Article.find({
      status: "published",
      isFeatured: true,
      $or: [
        { publishedAt: null },
        { publishedAt: { $lte: new Date() } }
      ]
    })
      .populate("category", "name slug")
      .populate("author", "name")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET POPULAR ARTICLES
exports.getPopularArticles = async (req, res) => {
  try {
    const articles = await Article.find({
      status: "published",
      $or: [
        { publishedAt: null },
        { publishedAt: { $lte: new Date() } }
      ]
    })
      .populate("category", "name slug")
      .populate("author", "name")
      .sort({ views: -1 })
      .limit(5);

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
