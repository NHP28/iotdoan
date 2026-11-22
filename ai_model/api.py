"""Private HTTP adapter for the existing face_recognition model.

Run: python -m uvicorn api:app --host 127.0.0.1 --port 8000
Only NestJS should call this service; do not expose it through nginx.
"""
import base64
import binascii
import io
import os
from typing import Literal
from pathlib import Path

env_file = Path(__file__).with_name('.env')
if env_file.exists():
    for line in env_file.read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

import face_recognition
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field
from face_detection import detect_faces, detector_name

app = FastAPI(title="DriverHub Face Recognition", docs_url=None, redoc_url=None)
THRESHOLD = float(os.environ.get("FACE_DISTANCE_THRESHOLD", "0.52"))
Image.MAX_IMAGE_PIXELS = 16_000_000


class FaceRequest(BaseModel):
    image: str = Field(max_length=4_200_000)


class VerifyRequest(FaceRequest):
    embedding: list[float] = Field(min_length=128, max_length=128)


class BatchRequest(BaseModel):
    images: list[str] = Field(min_length=1, max_length=8)


class PreviewRequest(FaceRequest):
    pose: Literal['front', 'left', 'right'] = 'front'


def read_image(data_url: str):
    try:
        header, encoded = data_url.split(",", 1)
        if header not in ("data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"):
            raise ValueError("Invalid image type")
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 3_000_000:
            raise HTTPException(413, "Ảnh cần nhỏ hơn 3 MB.")
        with Image.open(io.BytesIO(raw)) as photo:
            photo = ImageOps.exif_transpose(photo).convert("RGB")
            photo.thumbnail((960, 960))
            return np.asarray(photo)
    except (ValueError, binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "Ảnh không hợp lệ hoặc không thể đọc.")


def encode(data_url: str):
    image = read_image(data_url)
    locations = detect_faces(image)
    if len(locations) != 1:
        raise HTTPException(400, "Ảnh cần có đúng một khuôn mặt rõ nét, nhìn thẳng.")
    encodings = face_recognition.face_encodings(image, locations)
    if len(encodings) != 1:
        raise HTTPException(400, "Không trích xuất được khuôn mặt. Vui lòng chụp lại.")
    top, right, bottom, left = locations[0]
    margin = int(max(bottom - top, right - left) * .2)
    crop = Image.fromarray(image).crop((max(0, left - margin), max(0, top - margin),
                                       min(image.shape[1], right + margin), min(image.shape[0], bottom + margin)))
    crop.thumbnail((320, 320))
    output = io.BytesIO()
    crop.save(output, format='JPEG', quality=85)
    avatar = 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode('ascii')
    return encodings[0], avatar


@app.post('/preview')
def preview(body: PreviewRequest):
    # Inspect only: frames and vectors are never persisted by this endpoint.
    image = read_image(body.image)
    height, width = image.shape[:2]
    locations = detect_faces(image)
    result = {'acceptable': False, 'face_count': len(locations), 'box': None,
              'pose': body.pose, 'quality': None}

    def feedback(code, message):
        return {**result, 'code': code, 'message': message}

    if not locations:
        return feedback('no_face', 'Camera chưa bắt rõ khuôn mặt. Giữ yên một chút và tránh ánh sáng phản vào kính.')
    if len(locations) > 1:
        return feedback('multiple_faces', 'Chỉ để một người trong khung hình.')
    top, right, bottom, left = locations[0]
    top, bottom = max(0, top), min(height, bottom)
    left, right = max(0, left), min(width, right)
    face_width, face_height = right - left, bottom - top
    result['box'] = {'x': left / width, 'y': top / height,
                     'width': face_width / width, 'height': face_height / height}
    if face_width < max(80, width * .22) or face_height < height * .28:
        return feedback('too_far', 'Đưa khuôn mặt lại gần camera hơn.')
    if face_width > width * .65 or face_height > height * .82:
        return feedback('too_close', 'Lùi ra một chút để thấy toàn bộ khuôn mặt.')
    if abs((left + right) / (2 * width) - .5) > .16 or abs((top + bottom) / (2 * height) - .56) > .18:
        return feedback('off_center', 'Di chuyển khuôn mặt vào giữa khung hình.')
    gray = cv2.cvtColor(image[top:bottom, left:right], cv2.COLOR_RGB2GRAY)
    brightness = float(gray.mean())
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    result['quality'] = {'brightness': round(brightness, 1), 'sharpness': round(sharpness, 1)}
    if brightness < 45:
        return feedback('too_dark', 'Thiếu sáng. Hãy quay về phía có ánh sáng.')
    if brightness > 225:
        return feedback('too_bright', 'Ánh sáng quá gắt. Hãy tránh chiếu sáng trực tiếp.')
    if sharpness < 35:
        return feedback('blurry', 'Giữ yên khuôn mặt và lau sạch camera nếu ảnh mờ.')
    landmarks = face_recognition.face_landmarks(image, [locations[0]], model='large')
    if not landmarks:
        return feedback('landmarks_missing', 'Chưa thấy rõ mắt và mũi. Hãy nhìn về phía camera.')
    points = landmarks[0]
    eyes = sorted([np.mean(points['left_eye'], axis=0), np.mean(points['right_eye'], axis=0)], key=lambda eye: eye[0])
    eye_span = float(np.linalg.norm(eyes[1] - eyes[0]))
    if eye_span < 15:
        return feedback('landmarks_missing', 'Hãy đưa khuôn mặt lại gần và nhìn về camera.')
    yaw = float((points['nose_bridge'][-1][0] - (eyes[0][0] + eyes[1][0]) / 2) / eye_span)
    roll = float(np.degrees(np.arctan2(eyes[1][1] - eyes[0][1], eyes[1][0] - eyes[0][0])))
    result['quality'].update({'yaw': round(yaw, 3), 'roll': round(roll, 1)})
    if abs(roll) > 15:
        return feedback('tilted', 'Giữ đầu thẳng, không nghiêng vai.')
    # "Left" and "right" are the person's own directions, matching the mirrored preview.
    correct_pose = {'front': abs(yaw) <= .12, 'left': .16 <= yaw <= .5, 'right': -.5 <= yaw <= -.16}[body.pose]
    if not correct_pose:
        message = {'front': 'Nhìn thẳng vào camera.', 'left': 'Quay mặt nhẹ sang trái, vẫn để camera thấy cả hai mắt.',
                   'right': 'Quay mặt nhẹ sang phải, vẫn để camera thấy cả hai mắt.'}[body.pose]
        return feedback('adjust_pose', message)
    # Keep feedback responsive: identity vectors are generated and validated once
    # the captured samples reach /enroll-batch, rather than for every preview frame.
    result['acceptable'] = True
    return feedback('ready', 'Đúng tư thế. Giữ yên để tự động lấy mẫu.')


@app.get("/health")
def health():
    return {"status": "ready", "model": "face_recognition", "threshold": THRESHOLD, "face_detector": detector_name()}


@app.post("/encode")
def enroll(body: FaceRequest):
    embedding, avatar = encode(body.image)
    return {"embedding": embedding.tolist(), "avatar": avatar}


@app.post('/enroll-batch')
def enroll_batch(body: BatchRequest):
    samples = []
    for index, image in enumerate(body.images):
        if len(image) > 4_200_000:
            raise HTTPException(413, f'Ảnh số {index + 1} quá lớn.')
        try:
            embedding, avatar = encode(image)
        except HTTPException as error:
            raise HTTPException(error.status_code, f'Ảnh số {index + 1}: {error.detail}') from error
        if any(float(np.linalg.norm(embedding - np.asarray(sample['embedding']))) >= THRESHOLD for sample in samples):
            raise HTTPException(400, 'Các mẫu không cùng một người hoặc khuôn mặt quá khác biệt. Hãy chọn lại ảnh rõ nét của cùng nhân viên.')
        samples.append({'embedding': embedding.tolist(), 'avatar': avatar})
    centroid = np.mean([sample['embedding'] for sample in samples], axis=0)
    return {'embedding': centroid.tolist(), 'avatar': samples[0]['avatar'], 'samples': samples,
            'sample_count': len(samples), 'model': 'dlib-face-recognition-128'}


@app.post("/verify")
def verify(body: VerifyRequest):
    registered = np.asarray(body.embedding, dtype=np.float64)
    if not np.isfinite(registered).all():
        raise HTTPException(400, "Vector khuôn mặt không hợp lệ.")
    distance = float(face_recognition.face_distance([registered], encode(body.image)[0])[0])
    return {"matched": distance < THRESHOLD, "distance": distance,
            "similarity": round(max(0, min(100, (1 - distance) * 100)), 2)}
