"""Fast webcam face localization; identity vectors still use the existing dlib model."""
import threading
from pathlib import Path

import cv2
import face_recognition


MODEL_PATH = Path(__file__).with_name('models') / 'face_detection_yunet_2023mar.onnx'
_local = threading.local()


def detect_faces(rgb):
    height, width = rgb.shape[:2]
    if MODEL_PATH.is_file():
        # OpenCV mutates input dimensions internally. Keep a detector per API thread.
        detector = getattr(_local, 'detector', None)
        if detector is None:
            detector = cv2.FaceDetectorYN.create(str(MODEL_PATH), '', (320, 320), .8, .3, 5000)
            _local.detector = detector
        scale = min(1, 640 / max(width, height))
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        if scale < 1:
            bgr = cv2.resize(bgr, (round(width * scale), round(height * scale)))
        detector.setInputSize((bgr.shape[1], bgr.shape[0]))
        _, faces = detector.detect(bgr)
        if faces is not None:
            locations = []
            for face in faces:
                x, y, face_width, face_height = face[:4] / scale
                top, right = max(0, int(y)), min(width, int(x + face_width))
                bottom, left = min(height, int(y + face_height)), max(0, int(x))
                if right - left >= 20 and bottom - top >= 20:
                    locations.append((top, right, bottom, left))
            if locations:
                return locations
    # Compatibility with Pi installations that do not yet include the YuNet asset.
    return face_recognition.face_locations(rgb)


def detector_name():
    return 'yunet+dlib-fallback' if MODEL_PATH.is_file() else 'dlib-hog'
