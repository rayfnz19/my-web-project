import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;
const uploadsRoot = path.join(__dirname, "uploads");
const posterDir = path.join(uploadsRoot, "posters");
const videoDir = path.join(uploadsRoot, "videos");

fs.mkdirSync(posterDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(uploadsRoot));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsRoot);
    },
    filename: (_req, file, cb) => {
      const folder = file.mimetype.startsWith("image/") ? "posters" : "videos";
      cb(null, `${Date.now()}-${folder}-${file.originalname}`);
    },
  }),
});

const movies = [
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

const watchHistory = [];
const favorites = [];

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    return res.json({
      token: "demo-token",
      user: { username: "admin", role: "admin" },
    });
  }
  return res.status(401).json({ message: "Username atau password salah" });
});

app.get("/api/movies", (_req, res) => res.json(movies));

app.get("/api/categories", (_req, res) => {
  const categories = [...new Set(movies.map((movie) => movie.category))];
  res.json(categories);
});

app.get("/api/movies/:id", (req, res) => {
  const movie = movies.find((item) => item.id === Number(req.params.id));
  if (!movie) return res.status(404).json({ message: "Film tidak ditemukan" });
  return res.json(movie);
});

app.post(
  "/api/movies",
  upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]),
  (req, res) => {
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

    movies.unshift(movie);
    return res.status(201).json(movie);
  }
);

app.put(
  "/api/movies/:id",
  upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]),
  (req, res) => {
    const movie = movies.find((item) => item.id === Number(req.params.id));
    if (!movie) return res.status(404).json({ message: "Film tidak ditemukan" });

    movie.title = req.body.title || movie.title;
    movie.description = req.body.description || movie.description;
    movie.category = req.body.category || movie.category;
    movie.year = Number(req.body.year || movie.year);
    movie.rating = Number(req.body.rating || movie.rating);
    movie.duration = Number(req.body.duration || movie.duration);
    movie.poster = req.files?.poster?.[0] ? `/uploads/${req.files.poster[0].filename}` : movie.poster;
    movie.video = req.files?.video?.[0] ? `/uploads/${req.files.video[0].filename}` : movie.video;
    movie.banner = req.body.banner || movie.banner;
    movie.subtitle = req.body.subtitle || movie.subtitle;
    movie.featured = Boolean(req.body.featured);

    return res.json(movie);
  }
);

app.delete("/api/movies/:id", (req, res) => {
  const index = movies.findIndex((movie) => movie.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Film tidak ditemukan" });
  movies.splice(index, 1);
  return res.json({ message: "Film berhasil dihapus" });
});

app.post("/api/favorites", (req, res) => {
  const { movieId } = req.body;
  const existing = favorites.find((id) => id === movieId);
  if (existing) return res.json({ favorites: favorites.filter((id) => id !== movieId) });

  favorites.push(movieId);
  return res.json({ favorites });
});

app.get("/api/favorites", (_req, res) => res.json({ favorites }));

app.get("/api/history", (_req, res) => res.json({ history: watchHistory }));

app.post("/api/history", (req, res) => {
  const { movieId, progress, currentTime } = req.body;
  const historyItem = {
    id: Date.now(),
    movieId,
    progress: Number(progress || 0),
    currentTime: Number(currentTime || 0),
    watchedAt: new Date().toISOString(),
  };

  const existingIndex = watchHistory.findIndex((entry) => entry.movieId === movieId);
  if (existingIndex >= 0) {
    watchHistory[existingIndex] = historyItem;
  } else {
    watchHistory.unshift(historyItem);
  }

  return res.json({ history: watchHistory });
});

app.get("/api/continue-watching", (req, res) => {
  const items = watchHistory
    .map((entry) => {
      const movie = movies.find((item) => item.id === entry.movieId);
      return movie ? { ...entry, movie } : null;
    })
    .filter(Boolean);

  return res.json({ items });
});

app.listen(PORT, () => {
  console.log(`Mini Netflix API running on http://localhost:${PORT}`);
});
