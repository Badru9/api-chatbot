import os
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from FlagEmbedding import BGEM3FlagModel, FlagReranker

app = FastAPI(
    title="BGE-M3 & Reranker Service",
    description="Microservice untuk generate embedding BGE-M3 (1024 dim) dan reranking menggunakan BGE-Reranker.",
    version="1.0.0"
)

# Cek device CUDA / GPU
device = "cuda" if torch.cuda.is_available() else "cpu"
use_fp16 = torch.cuda.is_available()

print(f"Loading models on device: {device} (use_fp16={use_fp16})...")

# Load model BGE-M3 (Dense Embedding)
try:
    embedding_model = BGEM3FlagModel('BAAI/bge-m3', use_fp16=use_fp16, device=device)
    print("BGE-M3 model loaded successfully.")
except Exception as e:
    print(f"Error loading BGE-M3 model: {e}")
    embedding_model = None

# Load model BGE Reranker
try:
    reranker_model = FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=use_fp16, device=device)
    print("BGE-Reranker model loaded successfully.")
except Exception as e:
    print(f"Error loading Reranker model: {e}")
    reranker_model = None

# Schemas
class EmbedRequest(BaseModel):
    text: str

class EmbedBatchRequest(BaseModel):
    texts: List[str]

class RerankPair(BaseModel):
    document: str

class RerankRequest(BaseModel):
    query: str
    passages: List[str]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "device": device,
        "embedding_model_loaded": embedding_model is not None,
        "reranker_model_loaded": reranker_model is not None
    }

@app.post("/embed")
async def embed(req: EmbedRequest):
    if not embedding_model:
        raise HTTPException(status_code=500, detail="Embedding model not loaded")
    try:
        # Kembalikan hanya dense embedding
        outputs = embedding_model.encode([req.text], return_dense=True, return_sparse=False, return_colbert_vecs=False)
        dense_vector = outputs['dense_vecs'][0].tolist()
        return {"embedding": dense_vector}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/batch")
async def embed_batch(req: EmbedBatchRequest):
    if not embedding_model:
        raise HTTPException(status_code=500, detail="Embedding model not loaded")
    try:
        outputs = embedding_model.encode(req.texts, return_dense=True, return_sparse=False, return_colbert_vecs=False)
        dense_vectors = outputs['dense_vecs'].tolist()
        return {"embeddings": dense_vectors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rerank")
async def rerank(req: RerankRequest):
    if not reranker_model:
        raise HTTPException(status_code=500, detail="Reranker model not loaded")
    try:
        # Susun pasangan [query, passage]
        pairs = [[req.query, passage] for passage in req.passages]
        scores = reranker_model.compute_score(pairs)
        
        # Jika hanya ada satu pasangan, kembalikan dalam bentuk list
        if isinstance(scores, float):
            scores = [scores]
            
        return {"scores": list(scores)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
