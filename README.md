# NexusRAG – AI Knowledge Operating System

Enterprise-grade AI platform that transforms uploaded documents into an intelligent, searchable knowledge system powered by RAG, NLP, semantic search, vector databases, and LLM reasoning.

![NexusRAG](https://img.shields.io/badge/NexusRAG-Knowledge%20OS-6366f1)

## Features

- **Complete RAG Pipeline** — Upload → Process → Chunk → Embed → Retrieve → Generate with citations
- **Advanced NLP** — Named Entity Recognition, keyword extraction, topic detection, classification, sentiment
- **Semantic Search** — Meaning-based search powered by Sentence Transformers + FAISS
- **Knowledge Graph** — Interactive entity relationship visualization
- **Research Assistant** — Contradiction detection, trend analysis, document comparison
- **Citation Engine** — Every answer includes document name, page number, and confidence score
- **Streaming Chat** — Real-time SSE responses with conversation memory
- **Analytics Dashboard** — Keywords, entities, topics, sentiment, document statistics
- **Enterprise UI** — Matte dark theme, 3D neural network hero, premium SaaS design

## Architecture

```
React Frontend → Flask API → Document Processing → NLP Engine
    → Chunking → Embeddings (Sentence Transformers) → FAISS
    → Retriever → Prompt Builder → Gemini API → Citation Engine
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion, Three.js, React Query, Zustand |
| Backend | Python, Flask, LangChain, Sentence Transformers, FAISS, Gemini API |
| Database | PostgreSQL |
| Auth | JWT, Protected Routes, Rate Limiting |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Gemini API key ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone and configure

```bash
cd RAG
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and database credentials
```

### 2. Start with Docker (recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432

### 3. Manual setup

**Backend:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python run.py
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Database:**

Create a PostgreSQL database named `nexusrag` or update `DATABASE_URL` in `.env`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/profile` | Get user profile |
| POST | `/api/documents/upload` | Upload documents (PDF, DOCX, TXT) |
| GET | `/api/documents` | List user documents |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/chat` | Chat with RAG (supports SSE streaming) |
| POST | `/api/chat/search` | Semantic search |
| POST | `/api/chat/research` | Research assistant analysis |
| GET | `/api/analytics` | NLP analytics dashboard data |
| GET | `/api/knowledge-graph` | Knowledge graph nodes and edges |
| GET | `/api/health` | Health check |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET_KEY` | JWT signing secret | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `EMBEDDING_MODEL` | Sentence Transformer model | `all-MiniLM-L6-v2` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |

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
10. **Generate** — Gemini LLM with citation requirements
11. **Cite** — Source document, page, confidence score

## Project Structure

```
RAG/
├── backend/
│   ├── app/
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── routes/            # REST API blueprints
│   │   └── services/          # RAG pipeline services
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Landing, Auth, Dashboard
│   │   ├── lib/               # API client
│   │   └── store/             # Zustand state
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Security

- JWT authentication on all protected routes
- Input sanitization with Bleach
- Rate limiting (Flask-Limiter)
- Secure file upload validation
- Role-based access control foundation

## License

MIT
