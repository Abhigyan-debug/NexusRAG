from datetime import datetime
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default="user")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = db.relationship("Document", backref="owner", lazy="dynamic", cascade="all, delete-orphan")
    chats = db.relationship("Chat", backref="owner", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    filename = db.Column(db.String(512), nullable=False)
    original_filename = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)
    file_size = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default="pending")
    error_message = db.Column(db.Text, nullable=True)
    page_count = db.Column(db.Integer, default=0)
    word_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    metadata_record = db.relationship("DocumentMetadata", backref="document", uselist=False, cascade="all, delete-orphan")
    chunks = db.relationship("Chunk", backref="document", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "status": self.status,
            "error_message": self.error_message,
            "page_count": self.page_count,
            "word_count": self.word_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "metadata": self.metadata_record.to_dict() if self.metadata_record else None,
        }


class DocumentMetadata(db.Model):
    __tablename__ = "document_metadata"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=False, unique=True)
    language = db.Column(db.String(20))
    title = db.Column(db.String(512))
    author = db.Column(db.String(255))
    topics = db.Column(db.JSON, default=list)
    keywords = db.Column(db.JSON, default=list)
    entities = db.Column(db.JSON, default=list)
    classification = db.Column(db.String(100))
    sentiment = db.Column(db.Float, default=0.0)
    sections = db.Column(db.JSON, default=list)
    summary = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "language": self.language,
            "title": self.title,
            "author": self.author,
            "topics": self.topics or [],
            "keywords": self.keywords or [],
            "entities": self.entities or [],
            "classification": self.classification,
            "sentiment": self.sentiment,
            "sections": self.sections or [],
            "summary": self.summary,
        }


class Chunk(db.Model):
    __tablename__ = "chunks"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=False)
    page_number = db.Column(db.Integer, default=1)
    metadata_json = db.Column(db.JSON, default=dict)
    faiss_id = db.Column(db.Integer, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    embedding = db.relationship("Embedding", backref="chunk", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "content": self.content[:500],
            "page_number": self.page_number,
            "metadata": self.metadata_json or {},
        }


class Embedding(db.Model):
    __tablename__ = "embeddings"

    id = db.Column(db.Integer, primary_key=True)
    chunk_id = db.Column(db.Integer, db.ForeignKey("chunks.id"), nullable=False, unique=True)
    model_name = db.Column(db.String(100), nullable=False)
    dimension = db.Column(db.Integer, default=384)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Chat(db.Model):
    __tablename__ = "chats"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), default="New Chat")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship("Message", backref="chat", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_messages=False):
        data = {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages.order_by(Message.created_at)]
        return data


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey("chats.id"), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    citations = db.Column(db.JSON, default=list)
    confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "chat_id": self.chat_id,
            "role": self.role,
            "content": self.content,
            "citations": self.citations or [],
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Analytics(db.Model):
    __tablename__ = "analytics"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    metric_type = db.Column(db.String(100), nullable=False)
    metric_data = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class KnowledgeGraphNode(db.Model):
    __tablename__ = "knowledge_graph_nodes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    node_id = db.Column(db.String(100), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    node_type = db.Column(db.String(50), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=True)
    properties = db.Column(db.JSON, default=dict)

    def to_dict(self):
        return {
            "id": self.node_id,
            "label": self.label,
            "type": self.node_type,
            "document_id": self.document_id,
            "properties": self.properties or {},
        }


class KnowledgeGraphEdge(db.Model):
    __tablename__ = "knowledge_graph_edges"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    source_id = db.Column(db.String(100), nullable=False)
    target_id = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Float, default=1.0)

    def to_dict(self):
        return {
            "source": self.source_id,
            "target": self.target_id,
            "relationship": self.relationship,
            "weight": self.weight,
        }
