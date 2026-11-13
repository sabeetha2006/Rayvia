const Article = require("../models/Article");

let running = false;

const publishDueArticles = async () => {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const result = await Article.updateMany(
      {
        status: "scheduled",
        scheduledAt: { $lte: now }
      },
      {
        $set: {
          status: "published",
          publishedAt: now,
          scheduledAt: null
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Published ${result.modifiedCount} scheduled article(s)`);
    }
  } catch (error) {
    console.error("Scheduled article publishing failed:", error.message);
  } finally {
    running = false;
  }
};

const startArticleScheduler = () => {
  publishDueArticles();
  const timer = setInterval(publishDueArticles, 30_000);
  timer.unref();
};

module.exports = startArticleScheduler;
