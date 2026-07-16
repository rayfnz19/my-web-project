"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || "Login gagal");
      return;
    }

    localStorage.setItem("mini-netflix-token", data.token);
    setMessage("Login berhasil. Anda akan diarahkan ke halaman admin.");
    router.push("/admin");
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Mini Netflix</p>
        <h1>Login Admin</h1>
        <p className="muted">Gunakan akun demo admin untuk mengelola film.</p>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="primary-button" type="submit">Masuk</button>
        </form>

        {message ? <p className="status-text">{message}</p> : null}

        <div className="inline-actions">
          <Link href="/">Kembali ke Home</Link>
        </div>
      </section>
    </main>
  );
}
