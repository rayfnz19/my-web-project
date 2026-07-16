# Mini Netflix

Aplikasi demo streaming film berbasis Next.js untuk frontend dan Node.js untuk backend.

## Fitur

- Login admin
- Home page
- Banner film
- Search film
- Favorit
- Riwayat tontonan
- Continue watching
- Detail film
- Tambah film
- Edit film
- Hapus film
- Upload poster
- Upload video
- Streaming video
- Progress video
- Subtitle

## Teknologi

- Next.js 16
- React 19
- Node.js
- Express
- Multer

## Demo Login

- Username: `admin`
- Password: `admin123`
- Setelah login, token JWT akan disimpan di browser untuk admin CRUD.

## Menjalankan Project

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## API utama

- `POST /api/login`
- `GET /api/movies`
- `POST /api/movies`
- `PUT /api/movies/:id`
- `DELETE /api/movies/:id`
- `GET /api/categories`
- `GET /api/history`
- `POST /api/history`
- `GET /api/continue-watching`

## Upload ke GitHub

```bash
git init
git add .
git commit -m "Initial mini netflix app"
git branch -M main
git remote add origin <URL_REPOSITORY_GITHUB>
git push -u origin main
```

## Catatan

Project ini bersifat demo dan belum menggunakan database. Data film disimpan sementara dalam memori server Node.js.
