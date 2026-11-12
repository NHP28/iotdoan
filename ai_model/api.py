"""Private HTTP adapter for the existing face_recognition model.

Run: python -m uvicorn api:app --host 127.0.0.1 --port 8000
Only NestJS should call this service; do not expose it through nginx.
"""
import base64
import binascii
import io
import os
from typing import Literal

import face_recognition
import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

app = FastAPI(title="DriverHub Face Recognition", docs_url=None, redoc_url=None)
THRESHOLD = float(os.environ.get("FACE_DISTANCE_THRESHOLD", "0.52"))
Image.MAX_IMAGE_PIXELS = 16_000_000


class FaceRequest(BaseModel):
    image: str = Field(max_length=4_200_000)


class VerifyRequest(FaceRequest):
    embedding: list[float] = Field(min_length=128, max_length=128)


def encode(data_url: str):
    try:
        header, encoded = data_url.split(",", 1)
        if header not in ("data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"):
            raise ValueError("Invalid image type")
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 3_000_000:
            raise HTTPException(413, "Ảnh cần nhỏ hơn 3 MB.")
        with Image.open(io.BytesIO(raw)) as photo:
            photo.thumbnail((1280, 1280))
            image = np.asarray(photo.convert("RGB"))
        locations = face_recognition.face_locations(image)
        if len(locations) != 1:
            raise HTTPException(400, "Ảnh cần có đúng một khuôn mặt rõ nét, nhìn thẳng.")
        encodings = face_recognition.face_encodings(image, locations)
        if len(encodings) != 1:
            raise HTTPException(400, "Không trích xuất được khuôn mặt. Vui lòng chụp lại.")
        return encodings[0]
    except (ValueError, binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "Ảnh không hợp lệ hoặc không thể đọc.")


@app.get("/health")
def health():
    return {"status": "ready", "model": "face_recognition", "threshold": THRESHOLD}


@app.post("/encode")
def enroll(body: FaceRequest):
    embedding = encode(body.image).tolist()
    raw = base64.b64decode(body.image.split(",", 1)[1], validate=True)
    with Image.open(io.BytesIO(raw)) as photo:
        photo = photo.convert("RGB")
        photo.thumbnail((160, 160))
        output = io.BytesIO()
        photo.save(output, format="JPEG", quality=80)
    return {"embedding": embedding, "avatar": "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")}


@app.post("/verify")
def verify(body: VerifyRequest):
    registered = np.asarray(body.embedding, dtype=np.float64)
    if not np.isfinite(registered).all():
        raise HTTPException(400, "Vector khuôn mặt không hợp lệ.")
    distance = float(face_recognition.face_distance([registered], encode(body.image))[0])
    return {"matched": distance < THRESHOLD, "distance": distance,
            "similarity": round(max(0, min(100, (1 - distance) * 100)), 2)}
