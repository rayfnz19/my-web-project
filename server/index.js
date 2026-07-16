import express from "express";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "storage.json");
const uploadsRoot = path.join(__dirname, "uploads");
const JWT_SECRET = process.env.JWT_SECRET || "mini-netflix-secret";
const PORT = Number(process.env.PORT || 4000);

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsRoot, { recursive: true });

const seedStore = {
  movies: [
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
  ],
  watchHistory: [],
  favorites: [],
};

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify(seedStore, null, 2));
}

const loadStore = () => {
  const raw = fs.readFileSync(dataFile, "utf8");
  return JSON.parse(raw);
};

const persistStore = (store) => {
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
};

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

app.get("/api/movies", (_req, res) => {
  const store = loadStore();
  return res.json(store.movies);
});

app.get("/api/categories", (_req, res) => {
  const store = loadStore();
  const categories = [...new Set(store.movies.map((movie) => movie.category))];
  return res.json(categories);
});

app.get("/api/movies/:id", (req, res) => {
  const store = loadStore();
  const movie = store.movies.find((item) => item.id === Number(req.params.id));
  if (!movie) return res.status(404).json({ message: "Film tidak ditemukan" });
  return res.json(movie);
});

app.post(
  "/api/movies",
  authenticate,
  upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]),
  (req, res) => {
    const store = loadStore();
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

    store.movies.unshift(movie);
    persistStore(store);
    return res.status(201).json(movie);
  }
);

app.put(
  "/api/movies/:id",
  authenticate,
  upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]),
  (req, res) => {
    const store = loadStore();
    const movie = store.movies.find((item) => item.id === Number(req.params.id));
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

    persistStore(store);
    return res.json(movie);
  }
);

app.delete("/api/movies/:id", authenticate, (req, res) => {
  const store = loadStore();
  const index = store.movies.findIndex((movie) => movie.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Film tidak ditemukan" });
  store.movies.splice(index, 1);
  persistStore(store);
  return res.json({ message: "Film berhasil dihapus" });
});

app.post("/api/favorites", (req, res) => {
  const store = loadStore();
  const { movieId } = req.body;
  const existing = store.favorites.find((id) => id === movieId);
  if (existing) {
    const updated = store.favorites.filter((id) => id !== movieId);
    store.favorites = updated;
    persistStore(store);
    return res.json({ favorites: updated });
  }

  store.favorites.push(movieId);
  persistStore(store);
  return res.json({ favorites: store.favorites });
});

app.get("/api/favorites", (_req, res) => {
  const store = loadStore();
  return res.json({ favorites: store.favorites });
});

app.get("/api/history", (_req, res) => {
  const store = loadStore();
  return res.json({ history: store.watchHistory });
});

app.post("/api/history", (req, res) => {
  const store = loadStore();
  const { movieId, progress, currentTime } = req.body;
  const historyItem = {
    id: Date.now(),
    movieId,
    progress: Number(progress || 0),
    currentTime: Number(currentTime || 0),
    watchedAt: new Date().toISOString(),
  };

  const existingIndex = store.watchHistory.findIndex((entry) => entry.movieId === movieId);
  if (existingIndex >= 0) {
    store.watchHistory[existingIndex] = historyItem;
  } else {
    store.watchHistory.unshift(historyItem);
  }

  persistStore(store);
  return res.json({ history: store.watchHistory });
});

app.get("/api/continue-watching", (_req, res) => {
  const store = loadStore();
  const items = store.watchHistory
    .map((entry) => {
      const movie = store.movies.find((item) => item.id === entry.movieId);
      return movie ? { ...entry, movie } : null;
    })
    .filter(Boolean);

  return res.json({ items });
});

app.listen(PORT, () => {
  console.log(`Mini Netflix API running on http://localhost:${PORT}`);
});
