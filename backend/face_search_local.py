"""
Local face search helpers (no paid API).

Stores normalized face embeddings (float list) and compares with cosine similarity.
Uses InsightFace + ONNXRuntime (CPU).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence

import os
import numpy as np
import cv2
from insightface.app import FaceAnalysis


@dataclass(frozen=True)
class FaceMatch:
    photo_id: str
    score: float


_face_app: FaceAnalysis | None = None


def get_face_app() -> FaceAnalysis:
    global _face_app
    if _face_app is None:
        model_name = os.getenv("INSIGHTFACE_MODEL", "buffalo_s")  # << troca aqui
        det = int(os.getenv("INSIGHTFACE_DET_SIZE", "320"))       # << menor = menos RAM

        _face_app = FaceAnalysis(name=model_name, providers=["CPUExecutionProvider"])
        _face_app.prepare(ctx_id=-1, det_size=(det, det))         # << CPU sempre
    return _face_app


def bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Invalid image bytes")
    return bgr


def extract_face_embedding(image_bytes: bytes) -> Optional[list[float]]:
    """
    Returns normalized embedding for the largest detected face; None if no face.
    """
    bgr = bytes_to_bgr(image_bytes)
    faces = get_face_app().get(bgr)
    if not faces:
        return None

    faces.sort(
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        reverse=True,
    )
    emb = faces[0].embedding
    if emb is None:
        return None

    emb = emb.astype(np.float32)
    emb /= (np.linalg.norm(emb) + 1e-9)
    return emb.tolist()


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    return float(np.dot(va, vb) / ((np.linalg.norm(va) + 1e-9) * (np.linalg.norm(vb) + 1e-9)))
