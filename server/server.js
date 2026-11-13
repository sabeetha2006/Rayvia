
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const startArticleScheduler = require("./services/articleScheduler");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

connectDB().then(startArticleScheduler);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully"
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/api/authors", require("./routes/authorRoutes"));
app.use("/api/tags", require("./routes/tagRoutes"));
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
