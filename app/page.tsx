"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Movie {
  id: number;
  title: string;
  description: string;
  category: string;
  poster: string;
  banner: string;
  video: string;
  subtitle: string;
  duration: number;
  rating: number;
  featured?: boolean;
}

interface HistoryItem {
  id: number;
  movieId: number;
  progress: number;
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      const [moviesResponse, favoritesResponse, historyResponse] = await Promise.all([
        fetch("http://localhost:4000/api/movies"),
        fetch("http://localhost:4000/api/favorites"),
        fetch("http://localhost:4000/api/history"),
      ]);

      const movieData = (await moviesResponse.json()) as Movie[];
      const favoriteData = (await favoritesResponse.json()) as { favorites: number[] };
      const historyData = (await historyResponse.json()) as { history: HistoryItem[] };

      if (isActive) {
        setMovies(movieData);
        setFavorites(favoriteData.favorites);
        setHistory(historyData.history);
      }
    };

    void loadData();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredMovies = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return movies;

    return movies.filter((movie) => {
      return [movie.title, movie.description, movie.category].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
  }, [movies, query]);

  const featuredMovie = movies.find((movie) => movie.featured) || movies[0];

  const toggleFavorite = async (movieId: number) => {
    const response = await fetch("http://localhost:4000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });

    const data = await response.json();
    setFavorites(data.favorites);
  };

  return (
    <main className="home-shell">
      <section className="hero-banner" style={{ backgroundImage: `url(${featuredMovie?.banner || featuredMovie?.poster})` }}>
        <div className="hero-overlay">
          <p className="eyebrow">Mini Netflix</p>
          <h1>{featuredMovie?.title || "Streaming Experience"}</h1>
          <p>{featuredMovie?.description || "Aplikasi katalog film modern untuk demo."}</p>
          <div className="inline-actions">
            <Link href="/login" className="primary-button">Login Admin</Link>
            <Link href="/admin" className="ghost-button">Admin Panel</Link>
          </div>
        </div>
      </section>

      <section className="search-panel">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari film, genre, atau deskripsi"
        />
      </section>

      <section className="content-column">
        <div className="section-heading">
          <h2>Home</h2>
        </div>
        <div className="movie-grid">
          {filteredMovies.map((movie) => (
            <article key={movie.id} className="movie-card">
              <Image src={movie.poster} alt={movie.title} width={800} height={1000} />
              <div className="movie-card-body">
                <div className="movie-card-top">
                  <h3>{movie.title}</h3>
                  <button className="icon-button" onClick={() => toggleFavorite(movie.id)}>
                    {favorites.includes(movie.id) ? "♥" : "♡"}
                  </button>
                </div>
                <p>{movie.category}</p>
                <div className="inline-actions">
                  <Link href={`/movie/${movie.id}`} className="primary-button">Detail</Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="section-heading">
          <h2>Favorit</h2>
        </div>
        <div className="movie-grid compact-grid">
          {movies.filter((movie) => favorites.includes(movie.id)).map((movie) => (
            <article key={movie.id} className="movie-card small-card">
              <Image src={movie.poster} alt={movie.title} width={800} height={1000} />
              <h3>{movie.title}</h3>
            </article>
          ))}
        </div>

        <div className="section-heading">
          <h2>Riwayat Tontonan</h2>
        </div>
        <div className="history-grid">
          {history.slice(0, 4).map((item) => (
            <div key={item.id} className="history-card">
              <strong>Film #{item.movieId}</strong>
              <p>{item.progress}% selesai</p>
            </div>
          ))}
        </div>

        <div className="section-heading">
          <h2>Continue Watching</h2>
        </div>
        <div className="continue-grid">
          {history.slice(0, 3).map((item) => (
            <div key={item.id} className="continue-card">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${item.progress}%` }} />
              </div>
              <span>Progress {item.progress}%</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
