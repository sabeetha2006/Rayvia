
const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  excerpt: {
    type: String,
    required: true
  },

  content: {
    type: String,
    required: true
  },

  coverImage: {
    type: String,
    default: ""
  },

  contentImages: [{
    type: String
  }],

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author",
    required: true
  },

  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tag"
  }],

  status: {
    type: String,
    enum: ["draft", "published", "scheduled"],
    default: "draft"
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  scheduledAt: {
    type: Date,
    default: null
  },

  publishedAt: {
    type: Date,
    default: null
  },

  readingTime: {
    type: Number,
    default: 0
  },

  views: {
    type: Number,
    default: 0
  },

  seoTitle: {
    type: String,
    default: ""
  },

  metaDescription: {
    type: String,
    default: ""
  },

  previousArticle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Article",
    default: null
  },

  nextArticle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Article",
    default: null
  }

}, { timestamps: true });

articleSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model("Article", articleSchema);
