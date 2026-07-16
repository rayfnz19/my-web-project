"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface MovieDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  poster: string;
  banner: string;
  video: string;
  subtitle: string;
}

interface WatchHistoryItem {
  id: number;
  movieId: number;
  progress: number;
}

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isActive = true;

    const fetchMovie = async () => {
      const response = await fetch(`http://localhost:4000/api/movies/${params.id}`);
      const data = (await response.json()) as MovieDetail;
      if (isActive) {
        setMovie(data);
      }
    };

    const fetchHistory = async () => {
      const response = await fetch("http://localhost:4000/api/history");
      const data = (await response.json()) as { history: WatchHistoryItem[] };
      if (isActive) {
        setHistory(data.history);
      }
    };

    void fetchMovie();
    void fetchHistory();

    return () => {
      isActive = false;
    };
  }, [params.id]);

  const handleProgress = async (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const percent = Math.round((video.currentTime / video.duration) * 100);
    setProgress(percent);

    await fetch("http://localhost:4000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: Number(params.id),
        progress: percent,
        currentTime: Math.round(video.currentTime),
      }),
    });
  };

  if (!movie) return <main className="page-shell">Memuat detail film...</main>;

  return (
    <main className="movie-detail-shell">
      <div className="movie-banner" style={{ backgroundImage: `url(${movie.banner || movie.poster})` }}>
        <div className="movie-banner-overlay">
          <p className="eyebrow">Now Streaming</p>
          <h1>{movie.title}</h1>
          <p>{movie.description}</p>
          <div className="inline-actions">
            <Link href="/" className="primary-button">Kembali ke Home</Link>
          </div>
        </div>
      </div>

      <section className="detail-grid">
        <div className="video-column">
          <video className="detail-video" controls poster={movie.poster} onTimeUpdate={handleProgress}>
            <source src={movie.video} />
            <track kind="subtitles" src={movie.subtitle} srcLang="en" label="English" default />
          </video>
          <div className="progress-box">
            <strong>Progress video</strong>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}% selesai</span>
          </div>
        </div>

        <aside className="detail-sidebar">
          <h2>Riwayat tontonan</h2>
          <ul className="history-list">
            {history.slice(0, 4).map((item) => (
              <li key={item.id}>{item.movieId} • {item.progress}%</li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
