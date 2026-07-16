"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

interface MovieItem {
  id: number;
  title: string;
  description: string;
  category: string;
  year: number;
  rating: number;
  duration: number;
  poster: string;
  banner: string;
  video: string;
  subtitle: string;
}

interface MovieForm {
  id?: number;
  title: string;
  description: string;
  category: string;
  year: string;
  rating: string;
  duration: string;
  poster: string;
  banner: string;
  video: string;
  subtitle: string;
}

const emptyForm: MovieForm = {
  title: "",
  description: "",
  category: "Action",
  year: "2026",
  rating: "8.5",
  duration: "120",
  poster: "",
  banner: "",
  video: "",
  subtitle: "/subtitles/en.vtt",
};

export default function AdminPage() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [form, setForm] = useState<MovieForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const fetchMovies = async () => {
    const response = await fetch("http://localhost:4000/api/movies");
    const data = await response.json();
    setMovies(data as MovieItem[]);
  };

  useEffect(() => {
    let isActive = true;

    const loadMovies = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/movies");
        const data = (await response.json()) as MovieItem[];
        if (isActive) {
          setMovies(data);
        }
      } catch {
        if (isActive) {
          setMovies([]);
        }
      }
    };

    void loadMovies();

    return () => {
      isActive = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(form.title && form.description && form.category);
  }, [form]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, key: "poster" | "video") => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (key === "poster") {
      setPosterFile(file);
      setForm((current) => ({ ...current, poster: file.name }));
      return;
    }

    setVideoFile(file);
    setForm((current) => ({ ...current, video: file.name }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setMessage("Judul, deskripsi, dan kategori wajib diisi.");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    if (posterFile) {
      formData.append("poster", posterFile);
    }

    if (videoFile) {
      formData.append("video", videoFile);
    }

    const endpoint = editingId ? `http://localhost:4000/api/movies/${editingId}` : "http://localhost:4000/api/movies";
    const method = editingId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      body: formData,
    });

    const data = await response.json();
    setMessage(editingId ? `Film berhasil diubah: ${data.title}` : `Film berhasil ditambahkan: ${data.title}`);
    setEditingId(null);
    setPosterFile(null);
    setVideoFile(null);
    setForm(emptyForm);
    fetchMovies();
  };

  const handleEdit = (movie: MovieItem) => {
    setEditingId(movie.id);
    setForm({
      id: movie.id,
      title: movie.title,
      description: movie.description,
      category: movie.category,
      year: String(movie.year),
      rating: String(movie.rating),
      duration: String(movie.duration),
      poster: movie.poster,
      banner: movie.banner,
      video: movie.video,
      subtitle: movie.subtitle,
    });
    setMessage(`Sedang mengedit ${movie.title}`);
  };

  const handleDelete = async (id: number) => {
    await fetch(`http://localhost:4000/api/movies/${id}`, { method: "DELETE" });
    setMessage("Film berhasil dihapus.");
    fetchMovies();
  };

  return (
    <main className="admin-shell">
      <section className="admin-layout">
        <div className="admin-panel">
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Tambah Film</h1>
          <p className="muted">Upload poster, video, serta kelola data katalog film secara cepat.</p>
          <form className="admin-form" onSubmit={handleSubmit}>
            <input name="title" value={form.title} onChange={handleChange} placeholder="Judul film" />
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Deskripsi" />
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="Action">Action</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Adventure">Adventure</option>
              <option value="Drama">Drama</option>
            </select>
            <div className="grid-two">
              <input name="year" value={form.year} onChange={handleChange} placeholder="Tahun" />
              <input name="rating" value={form.rating} onChange={handleChange} placeholder="Rating" />
            </div>
            <div className="grid-two">
              <input name="duration" value={form.duration} onChange={handleChange} placeholder="Durasi" />
              <input name="subtitle" value={form.subtitle} onChange={handleChange} placeholder="Subtitle" />
            </div>
            <input name="poster" value={form.poster} onChange={handleChange} placeholder="Poster URL" />
            <input name="banner" value={form.banner} onChange={handleChange} placeholder="Banner URL" />
            <input name="video" value={form.video} onChange={handleChange} placeholder="Video URL" />
            <label className="upload-label">
              <span>Upload Poster</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "poster")} />
            </label>
            <label className="upload-label">
              <span>Upload Video</span>
              <input type="file" accept="video/*" onChange={(e) => handleFileChange(e, "video")} />
            </label>
            <button className="primary-button" type="submit">{editingId ? "Update Film" : "Simpan Film"}</button>
            {editingId ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setPosterFile(null);
                  setVideoFile(null);
                  setForm(emptyForm);
                  setMessage("Mode edit dibatalkan.");
                }}
              >
                Batal Edit
              </button>
            ) : null}
          </form>
          {message ? <p className="status-text">{message}</p> : null}
        </div>

        <aside className="admin-list">
          <h2>Daftar Film</h2>
          {movies.map((movie) => (
            <article key={movie.id} className="movie-row">
              <div>
                <strong>{movie.title}</strong>
                <p>{movie.category}</p>
              </div>
              <div className="inline-actions">
                <button className="ghost-button" onClick={() => handleEdit(movie)}>Edit</button>
                <button className="ghost-button" onClick={() => handleDelete(movie.id)}>Hapus</button>
              </div>
            </article>
          ))}
        </aside>
      </section>
    </main>
  );
}
