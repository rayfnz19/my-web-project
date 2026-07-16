import express from "express";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const uploadsRoot = path.join(__dirname, "uploads");
const JWT_SECRET = process.env.JWT_SECRET || "mini-netflix-secret";
const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL;

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsRoot, { recursive: true });

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const initDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      year INTEGER NOT NULL,
      rating REAL NOT NULL,
      duration INTEGER NOT NULL,
      poster TEXT,
      banner TEXT,
      video TEXT,
      subtitle TEXT,
      featured BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      movie_id INTEGER NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id SERIAL PRIMARY KEY,
      movie_id INTEGER NOT NULL UNIQUE,
      progress INTEGER NOT NULL DEFAULT 0,
      current_time INTEGER NOT NULL DEFAULT 0,
      watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const seedCount = await pool.query("SELECT COUNT(*)::int AS count FROM movies");
  if (seedCount.rows[0].count === 0) {
        const movieSeed = [
      {
        id: 1,
        title: "Shadow of the Moon",
        description:
          "Seorang pengintai galaksi yang harus menyelamatkan bumi dari rongrongan alien di orbit Saturnus.",
        category: "Sci-Fi",
        year: 2025,
        rating: 8.9,
        duration: 128,
        poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80",
        banner: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1400&q=80",
        video: "https://www.w3schools.com/html/mov_bbb.mp4",
        subtitle: "/subtitles/en.vtt",
        featured: true,
      },
      {
        id: 2,
        title: "Neon City",
        description:
          "Detektif jalanan berusaha mengungkap konspirasi kota masa depan yang sedang dikuasai oleh AI.",
        category: "Action",
        year: 2024,
        rating: 8.4,
        duration: 115,
        poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
        banner: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=1400&q=80",
        video: "https://www.w3schools.com/html/movie.mp4",
        subtitle: "/subtitles/en.vtt",
        featured: false,
      },
      {
        id: 3,
        title: "The Last Atlas",
        description:
          "Petualangan arkeolog dan pesulap yang mencari peta terakhir dunia yang hilang.",
        category: "Adventure",
        year: 2023,
        rating: 7.8,
        duration: 136,
        poster: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
        banner: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1400&q=80",
        video: "https://www.w3schools.com/html/mov_bbb.mp4",
        subtitle: "/subtitles/en.vtt",
        featured: false,
      },
    ];

    await Promise.all(
      movieSeed.map((movie) =>
        pool.query(
          `INSERT INTO movies (id, title, description, category, year, rating, duration, poster, banner, video, subtitle, featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            movie.id,
            movie.title,
            movie.description,
            movie.category,
            movie.year,
            movie.rating,
            movie.duration,
            movie.poster,
            movie.banner,
            movie.video,
            movie.subtitle,
            movie.featured,
          ]
        )
      )
    );
  }
};

await initDatabase();

const normalizeMovie = (movie) => ({
  ...movie,
  featured: Boolean(movie.featured),
});

const normalizeHistory = (row) => ({
  id: row.id,
  movieId: row.movie_id,
  progress: row.progress,
  currentTime: row.current_time,
  watchedAt: row.watched_at,
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(uploadsRoot));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsRoot),
    filename: (_req, file, cb) => {
      const folder = file.mimetype.startsWith("image/") ? "poster" : "video";
      cb(null, `${Date.now()}-${folder}-${file.originalname}`);
    },
  }),
});

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Token tidak valid" });
  }
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    const token = jwt.sign({ username: "admin", role: "admin" }, JWT_SECRET, {
      expiresIn: "8h",
    });

    return res.json({
      token,
      user: { username: "admin", role: "admin" },
    });
  }

  return res.status(401).json({ message: "Username atau password salah" });
});

app.get("/api/movies", async (_req, res) => {
  const rows = await pool.query("SELECT * FROM movies ORDER BY id DESC");
  return res.json(rows.rows.map(normalizeMovie));
});

app.get("/api/categories", async (_req, res) => {
  const rows = await pool.query("SELECT DISTINCT category FROM movies ORDER BY category ASC");
  return res.json(rows.rows.map((row) => row.category));
});

app.get("/api/movies/:id", async (req, res) => {
  const movie = await pool.query("SELECT * FROM movies WHERE id = $1", [Number(req.params.id)]);
  if (movie.rowCount === 0) return res.status(404).json({ message: "Film tidak ditemukan" });
  return res.json(normalizeMovie(movie.rows[0]));
});

app.post(
  "/api/movies",
  authenticate,
  upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]),
  async (req, res) => {
    const payload = req.body;
    const posterFile = req.files?.poster?.[0];
    const videoFile = req.files?.video?.[0];
    const movie = {
      id: Date.now(),
      title: payload.title,
      description: payload.description,
      category: payload.category,
      year: Number(payload.year || 2026),
      rating: Number(payload.rating || 7.5),
      duration: Number(payload.duration || 120),
      poster: posterFile ? `/uploads/${posterFile.filename}` : payload.poster,
      banner: payload.banner || payload.poster,
      video: videoFile ? `/uploads/${videoFile.filename}` : payload.video,
      subtitle: payload.subtitle || "/subtitles/en.vtt",
      featured: Boolean(payload.featured),
    };

    await pool.query(
      `INSERT INTO movies (id, title, description, category, year, rating, duration, poster, banner, video, subtitle, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        movie.id,
        movie.title,
        movie.description,
        movie.category,
        movie.year,
        movie.rating,
        movie.duration,
        movie.poster,
        movie.banner,
        movie.video,
        movie.subtitle,
        movie.featured,
      ]
    );

    return res.status(201).json(normalizeMovie(movie));
  }
);

app.put(
  "/api/movies/:id",
  authenticate,
  upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]),
  async (req, res) => {
    const existing = await pool.query("SELECT * FROM movies WHERE id = $1", [Number(req.params.id)]);
    if (existing.rowCount === 0) return res.status(404).json({ message: "Film tidak ditemukan" });

    const payload = req.body;
    const posterFile = req.files?.poster?.[0];
    const videoFile = req.files?.video?.[0];
    const movie = {
      id: Number(req.params.id),
      title: payload.title || existing.rows[0].title,
      description: payload.description || existing.rows[0].description,
      category: payload.category || existing.rows[0].category,
      year: Number(payload.year || existing.rows[0].year),
      rating: Number(payload.rating || existing.rows[0].rating),
      duration: Number(payload.duration || existing.rows[0].duration),
      poster: posterFile ? `/uploads/${posterFile.filename}` : payload.poster || existing.rows[0].poster,
      banner: payload.banner || existing.rows[0].banner,
      video: videoFile ? `/uploads/${videoFile.filename}` : payload.video || existing.rows[0].video,
      subtitle: payload.subtitle || existing.rows[0].subtitle,
      featured: Boolean(payload.featured) ? true : existing.rows[0].featured,
    };

    await pool.query(
      `UPDATE movies SET
        title = $1,
        description = $2,
        category = $3,
        year = $4,
        rating = $5,
        duration = $6,
        poster = $7,
        banner = $8,
        video = $9,
        subtitle = $10,
        featured = $11
      WHERE id = $12`,
      [
        movie.title,
        movie.description,
        movie.category,
        movie.year,
        movie.rating,
        movie.duration,
        movie.poster,
        movie.banner,
        movie.video,
        movie.subtitle,
        movie.featured,
        movie.id,
      ]
    );

    return res.json(normalizeMovie(movie));
  }
);

app.delete("/api/movies/:id", authenticate, async (req, res) => {
  const existing = await pool.query("SELECT * FROM movies WHERE id = $1", [Number(req.params.id)]);
  if (existing.rowCount === 0) return res.status(404).json({ message: "Film tidak ditemukan" });

  await pool.query("DELETE FROM movies WHERE id = $1", [Number(req.params.id)]);
  return res.json({ message: "Film berhasil dihapus" });
});

app.post("/api/favorites", async (req, res) => {
  const { movieId } = req.body;
  const existing = await pool.query("SELECT movie_id FROM favorites WHERE movie_id = $1", [movieId]);

  if (existing.rowCount > 0) {
    await pool.query("DELETE FROM favorites WHERE movie_id = $1", [movieId]);
    const favorites = await pool.query("SELECT movie_id FROM favorites ORDER BY id DESC");
    return res.json({ favorites: favorites.rows.map((row) => row.movie_id) });
  }

  await pool.query("INSERT INTO favorites (movie_id) VALUES ($1)", [movieId]);
  const favorites = await pool.query("SELECT movie_id FROM favorites ORDER BY id DESC");
  return res.json({ favorites: favorites.rows.map((row) => row.movie_id) });
});

app.get("/api/favorites", async (_req, res) => {
  const favorites = await pool.query("SELECT movie_id FROM favorites ORDER BY id DESC");
  return res.json({ favorites: favorites.rows.map((row) => row.movie_id) });
});

app.get("/api/history", async (_req, res) => {
  const rows = await pool.query("SELECT * FROM watch_history ORDER BY id DESC");
  return res.json({ history: rows.rows.map(normalizeHistory) });
});

app.post("/api/history", async (req, res) => {
  const { movieId, progress, currentTime } = req.body;
  const historyItem = {
    movieId,
    progress: Number(progress || 0),
    current_time: Number(currentTime || 0),
    watched_at: new Date().toISOString(),
  };

  const existing = await pool.query("SELECT * FROM watch_history WHERE movie_id = $1", [movieId]);

  if (existing.rowCount > 0) {
    await pool.query(
      `UPDATE watch_history SET
        progress = $1,
        current_time = $2,
        watched_at = $3
      WHERE movie_id = $4`,
      [historyItem.progress, historyItem.current_time, historyItem.watched_at, movieId]
    );
  } else {
    await pool.query(
      `INSERT INTO watch_history (movie_id, progress, current_time, watched_at)
       VALUES ($1, $2, $3, $4)`,
      [movieId, historyItem.progress, historyItem.current_time, historyItem.watched_at]
    );
  }

  const history = await pool.query("SELECT * FROM watch_history ORDER BY id DESC");
  return res.json({ history: history.rows.map(normalizeHistory) });
});

app.get("/api/continue-watching", async (_req, res) => {
  const rows = await pool.query("SELECT * FROM watch_history ORDER BY id DESC");
  const items = await Promise.all(
    rows.rows.map(async (entry) => {
      const movie = await pool.query("SELECT * FROM movies WHERE id = $1", [entry.movie_id]);
      return movie.rowCount > 0 ? { ...normalizeHistory(entry), movie: normalizeMovie(movie.rows[0]) } : null;
    })
  );

  return res.json({ items: items.filter(Boolean) });
});

app.listen(PORT, () => {
  console.log(`Mini Netflix API running on http://localhost:${PORT}`);
});
