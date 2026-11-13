import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api"
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("rayvia-admin-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const data = (request) => request.then((response) => response.data);

export const adminApi = {
  login: (credentials) => data(api.post("/auth/login", credentials)),
  profile: () => data(api.get("/auth/profile")),
  listArticles: (params) => data(api.get("/articles/admin", { params })),
  createArticle: (article) => data(api.post("/articles", article)),
  updateArticle: (id, article) => data(api.put(`/articles/${id}`, article)),
  deleteArticle: (id) => data(api.delete(`/articles/${id}`)),
  listCategories: () => data(api.get("/categories")),
  createCategory: (category) => data(api.post("/categories", category)),
  updateCategory: (id, category) => data(api.put(`/categories/${id}`, category)),
  deleteCategory: (id) => data(api.delete(`/categories/${id}`)),
  listAuthors: () => data(api.get("/authors")),
  createAuthor: (author) => data(api.post("/authors", author)),
  updateAuthor: (id, author) => data(api.put(`/authors/${id}`, author)),
  deleteAuthor: (id) => data(api.delete(`/authors/${id}`)),
  listTags: () => data(api.get("/tags")),
  createTag: (tag) => data(api.post("/tags", tag)),
  updateTag: (id, tag) => data(api.put(`/tags/${id}`, tag)),
  deleteTag: (id) => data(api.delete(`/tags/${id}`))
};

export const getApiError = (error) =>
  error.response?.data?.message || error.message || "Something went wrong.";
