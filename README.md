# NexusRAG – AI Knowledge Operating System

Enterprise-grade AI platform that transforms uploaded documents into an intelligent, searchable knowledge system powered by RAG, NLP, semantic search, vector databases, and LLM reasoning.

![NexusRAG](https://img.shields.io/badge/NexusRAG-Knowledge%20OS-6366f1)

## Features

### Knowledge & AI

- **Complete RAG Pipeline** — Upload → Process → Chunk → Embed → Retrieve → Generate with citations
- **Advanced NLP** — Named Entity Recognition, keyword extraction, topic detection, classification, sentiment
- **Semantic Search** — Meaning-based search powered by Sentence Transformers + FAISS
- **Knowledge Graph** — Interactive entity relationship visualization
- **Research Assistant** — Contradiction detection, trend analysis, document comparison
- **Citation Engine** — Every answer includes document name, page number, and confidence score
- **Streaming Chat** — Real-time SSE responses with conversation memory; conversations resume when you return
- **Bring your own model** — Choose Gemini or Grok per user and supply your own API key in Settings

### Workspace

- **Overview dashboard** — Totals with real growth vs. the previous period, usage chart for the last 7 days / 30 days / 12 months, and a live activity feed
- **Analytics** — Keywords, entities, topics, sentiment, document type distribution, activity timeline
- **Light, dark & system themes** — Full light mode, preference saved per device, no flash on load
- **3D landing page** — Interactive Three.js neural network that follows the pointer

### Security & accounts

- **Two-factor authentication** — Authenticator-app (TOTP) codes with QR setup and 8 one-time recovery codes
- **Session management** — See every device signed in to your account and sign any of them out
- **Admin dashboard** — Admins see who is signed in across the whole app (device, IP, activity, status) and can revoke sessions
- **Account controls** — Change password (signs out other devices), export your data, delete your account

## Architecture

```
React Frontend → Flask API → Document Processing → NLP Engine
    → Chunking → Embeddings (Sentence Transformers) → FAISS
    → Retriever → Prompt Builder → Gemini / Grok → Citation Engine
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion, Three.js, React Query, Zustand, Recharts |
| Backend | Python, Flask, LangChain, Sentence Transformers, FAISS, Gemini / Grok APIs |
| Database | SQLite by default, PostgreSQL supported |
| Auth | JWT with server-side sessions, TOTP 2FA, bcrypt, role-based admin, rate limiting |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- A Gemini API key ([Google AI Studio](https://aistudio.google.com/)) — or a Grok key
- PostgreSQL 15+ is optional; without `DATABASE_URL` the backend uses SQLite

### Manual setup

**Backend** — create `backend/.env` (see [Environment variables](#environment-variables)), then:

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
python run.py                # http://localhost:5000
```

Minimal `backend/.env`:

```env
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me-too
GEMINI_API_KEY=your-key
ADMIN_EMAILS=you@example.com
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

By default the frontend talks to the hosted API. To use your local backend, create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

### Docker

```bash
docker-compose up --build
```

Runs PostgreSQL, the backend (http://localhost:5000) and the frontend (http://localhost:5173). Put `GEMINI_API_KEY`, `JWT_SECRET_KEY` and `SECRET_KEY` in a `.env` file next to `docker-compose.yml`. The frontend image uses the hosted API unless `frontend/.env.local` (above) exists when you build — `VITE_API_URL` is baked in at build time.

### Database migrations

No manual migration step is needed. On startup the backend creates missing tables and adds new columns to existing ones, so an existing database upgrades in place.

## Admin access

There is no sign-up path to become an admin. Instead:

1. Set `ADMIN_EMAILS` on the backend to a comma-separated list of emails (on Render: service → **Environment**).
2. Redeploy or restart the backend.
3. Sign out and sign back in with that email — an **Admin** item appears in the sidebar.

Admin rights are checked against the database on every request. Removing an email from `ADMIN_EMAILS` does not demote an existing admin; change the user's `role` in the database for that.

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Flask secret | `dev-secret-key` — **change in production** |
| `JWT_SECRET_KEY` | JWT signing secret | `jwt-secret-key` — **change in production** |
| `JWT_ACCESS_TOKEN_EXPIRES` | Session length in seconds | `86400` (24 h) |
| `DATABASE_URL` | PostgreSQL connection string; leave empty for SQLite | SQLite in `DATA_DIR` |
| `DATA_DIR` | Folder for the SQLite database | `./data` |
| `GEMINI_API_KEY` | Default Gemini key (users can override in Settings) | — |
| `GROK_API_KEY` | Default Grok key | — |
| `LLM_PROVIDER` | Default provider: `gemini` or `grok` | `gemini` |
| `ADMIN_EMAILS` | Comma-separated emails granted the admin role | — |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `CORS_ORIGINS` | Extra comma-separated CORS origins | — |
| `EMBEDDING_MODEL` | Sentence Transformer model | `all-MiniLM-L6-v2` |
| `UPLOAD_FOLDER` | Where uploaded files are stored | `./uploads` |
| `FAISS_INDEX_PATH` | Where the vector index is stored | `./faiss_index` |
| `MAX_CONTENT_LENGTH` | Max upload size in bytes | `52428800` (50 MB) |

Render-specific tuning (Gunicorn workers, lightweight NLP) is documented in `backend/.env.render.example`.

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (build time) | Hosted Render API |

## API Endpoints

All endpoints except register, login and health require `Authorization: Bearer <token>`.

**Auth & account**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login; returns `two_factor_required` when a code is needed (resend with `otp`) |
| POST | `/api/auth/logout` | End the current session |
| GET / PUT | `/api/auth/profile` | Get / update profile |
| PUT | `/api/auth/password` | Change password (signs out other devices) |
| DELETE | `/api/auth/account` | Delete account and all data (requires password) |
| GET | `/api/auth/sessions` | List your active sessions |
| DELETE | `/api/auth/sessions/:id` | Sign out one of your sessions |
| POST | `/api/auth/sessions/revoke-others` | Sign out all other devices |
| POST | `/api/auth/2fa/setup` | Start 2FA setup (secret + QR URI) |
| POST | `/api/auth/2fa/enable` | Confirm a code, enable 2FA, get recovery codes |
| POST | `/api/auth/2fa/disable` | Disable 2FA (password + code) |
| POST | `/api/auth/2fa/recovery-codes` | Generate new recovery codes |

**Documents, chat & insights**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload documents (PDF, DOCX, TXT) |
| GET | `/api/documents` | List user documents |
| GET / DELETE | `/api/documents/:id` | Get / delete a document |
| POST | `/api/documents/:id/summarize` | Summarize a document |
| POST | `/api/chat` | Chat with RAG (supports SSE streaming) |
| GET | `/api/chat/history` | List conversations |
| GET | `/api/chat/:id` | Get a conversation with messages |
| POST | `/api/chat/search` | Semantic search |
| POST | `/api/chat/research` | Research assistant analysis |
| GET | `/api/analytics?range=7d\|30d\|12m&tz=` | Analytics, growth vs. previous period, timeline |
| GET | `/api/analytics/activity?limit=&offset=` | Activity feed |
| GET | `/api/knowledge-graph` | Knowledge graph nodes and edges |
| GET | `/api/health` | Health check |

**Admin** (admin role required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/overview` | User, session and 2FA totals |
| GET | `/api/admin/sessions?status=active\|all\|expired\|revoked&q=&page=` | Sign-ins across all users |
| DELETE | `/api/admin/sessions/:id` | Revoke any user's session |

## RAG Workflow

1. **Upload** — Drag & drop PDF, DOCX, or TXT files
2. **Process** — Text extraction, cleaning, language detection, metadata
3. **NLP** — NER, keywords, topics, classification, sentiment
4. **Chunk** — Semantic + recursive chunking with overlap
5. **Embed** — Sentence Transformers generate vector embeddings
6. **Index** — FAISS vector store for fast similarity search
7. **Query** — User question → query embedding → top-K retrieval
8. **Re-rank** — Similarity + keyword overlap scoring
9. **Prompt** — Dynamic prompt with context, metadata, history
10. **Generate** — Gemini or Grok LLM with citation requirements
11. **Cite** — Source document, page, confidence score

## Project Structure

```
RAG/
├── backend/
│   ├── app/
│   │   ├── models.py          # SQLAlchemy models (users, sessions, documents, chats, activity…)
│   │   ├── security.py        # Sessions, TOTP 2FA, activity logging
│   │   ├── routes/            # REST blueprints: auth, admin, documents, chat, analytics, knowledge graph
│   │   └── services/          # RAG pipeline services
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/     # Panels, admin, settings (appearance, 2FA, sessions)
│   │   │   ├── landing/       # 3D neural network scene
│   │   │   └── common/        # Theme toggle, range selector
│   │   ├── pages/             # Landing, Auth, Dashboard, About
│   │   ├── lib/               # API client, theme, chart theme, helpers
│   │   └── store/             # Zustand state
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Security

- JWT authentication bound to server-side sessions, so signing out or revoking a device takes effect immediately
- Optional TOTP two-factor authentication with replay protection and hashed one-time recovery codes
- bcrypt password hashing; changing the password signs out all other devices
- Role-based admin access, checked against the database on every request
- Input sanitization with Bleach
- Rate limiting (Flask-Limiter) on sign-in, 2FA, uploads and chat
- Secure file upload validation

## License

MIT
