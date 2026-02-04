-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Candidate embeddings table
CREATE TABLE candidate_embeddings (
  candidate_id VARCHAR(50) PRIMARY KEY,
  embedding vector(1024) NOT NULL,
  embedding_text TEXT NOT NULL,
  embedding_text_hash VARCHAR(64) NOT NULL,  -- SHA256 hash for deduplication/cache
  embedding_version VARCHAR(20) NOT NULL,     -- Our text format version (e.g., "v1.0")
  model_name VARCHAR(100) NOT NULL,           -- Full model ID (e.g., "amazon.titan-embed-text-v2:0")
  source_updated_at TIMESTAMP,                -- Candidate's updatedAt from MySQL (for drift detection)
  tokens_estimate INTEGER,                    -- Approximate tokens in embedding_text
  generation_latency_ms INTEGER,              -- Time to generate embedding
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Position embeddings table
CREATE TABLE position_embeddings (
  position_id VARCHAR(50) PRIMARY KEY,
  embedding vector(1024) NOT NULL,
  embedding_text TEXT NOT NULL,
  embedding_text_hash VARCHAR(64) NOT NULL,  -- SHA256 hash
  embedding_version VARCHAR(20) NOT NULL,     -- Our text format version (e.g., "v1.0")
  model_name VARCHAR(100) NOT NULL,           -- Full model ID
  source_updated_at TIMESTAMP,                -- Position's updatedAt from MySQL
  tokens_estimate INTEGER,                    -- Approximate tokens
  generation_latency_ms INTEGER,              -- Time to generate
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HNSW indexes for fast similarity search
CREATE INDEX idx_candidate_embeddings_hnsw ON candidate_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_position_embeddings_hnsw ON position_embeddings USING hnsw (embedding vector_cosine_ops);

-- Index on hash for cache lookups
CREATE INDEX idx_candidate_embeddings_hash ON candidate_embeddings(embedding_text_hash);
CREATE INDEX idx_position_embeddings_hash ON position_embeddings(embedding_text_hash);

-- Explanation cache table
CREATE TABLE explanation_cache (
  id SERIAL PRIMARY KEY,
  candidate_id VARCHAR(50) NOT NULL,
  position_id VARCHAR(50) NOT NULL,
  candidate_embedding_hash VARCHAR(64) NOT NULL,
  position_embedding_hash VARCHAR(64) NOT NULL,
  prompt_version VARCHAR(20) NOT NULL,       -- Explanation prompt version
  explanation TEXT NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL,    -- Cosine similarity (0-1)
  model_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, position_id, candidate_embedding_hash, position_embedding_hash, prompt_version)
);

CREATE INDEX idx_explanation_cache_lookup ON explanation_cache(candidate_id, position_id, candidate_embedding_hash, position_embedding_hash);

-- Retrieval logs table for diagnostics
CREATE TABLE retrieval_logs (
  id SERIAL PRIMARY KEY,
  query_type VARCHAR(50) NOT NULL,           -- 'suggest_candidates' | 'suggest_positions'
  query_entity_id VARCHAR(50) NOT NULL,      -- Position ID or Candidate ID
  top_k_entity_ids TEXT[] NOT NULL,          -- Array of candidate/position IDs retrieved
  top_k_scores DECIMAL(5,4)[] NOT NULL,      -- Array of similarity scores
  filters_applied JSONB,                      -- e.g., {"status": "Active", "excludedIds": [...]}
  final_count INTEGER NOT NULL,              -- Number of results after filtering
  retrieval_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_retrieval_logs_query ON retrieval_logs(query_type, query_entity_id);
