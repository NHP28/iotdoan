"""Outbound worker: cloud NestJS queue -> Raspberry Pi camera/model -> cloud result.

Run this instead of attendance_stream.py when drivers sign in on the website.
No inbound Pi port, database password, or public camera stream is required.
"""
import logging
import os
from pathlib import Path
import time

# Load checkout-local configuration without leaking the device key into logs/arguments.
env_file = Path(__file__).with_name('.env')
if env_file.exists():
    for line in env_file.read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

import cv2
import face_recognition
import requests
from fastapi import HTTPException
from api import FaceRequest, VerifyRequest, enroll, verify

SERVER_URL = os.environ.get('SERVER_URL', 'http://127.0.0.1:3000').rstrip('/')
if not SERVER_URL.endswith('/api/v1'):
    SERVER_URL += '/api/v1'
DEVICE_ID = os.environ.get('DEVICE_ID', 'raspi_cam_01')
DEVICE_KEY = os.environ.get('DEVICE_API_KEY', '')
SHOW_PREVIEW = os.environ.get('SHOW_PREVIEW', 'false').lower() == 'true'
CAPTURE_TIMEOUT = min(30, max(3, float(os.environ.get('CAPTURE_TIMEOUT', '12'))))
session = requests.Session()
session.headers.update({'x-device-key': DEVICE_KEY, 'x-device-id': DEVICE_ID})
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('driverhub-pi')


def cloud(method, path, **kwargs):
    response = session.request(method, f'{SERVER_URL}{path}', timeout=(5, 15), **kwargs)
    if not response.ok:
        # Only print status and application errors; never include request headers or image data.
        raise RuntimeError(f'Backend HTTP {response.status_code}. Kiểm tra URL và DEVICE_API_KEY.')
    return response.json().get('data')


class Camera:
    def __init__(self):
        self.picam = None
        self.cap = None

    def __enter__(self):
        if os.environ.get('CAMERA_BACKEND', 'opencv') == 'picamera2':
            try:
                from picamera2 import Picamera2
            except ImportError:
                raise RuntimeError('Cài python3-picamera2 trên Pi, hoặc chọn CAMERA_BACKEND=opencv cho USB camera.')
            self.picam = Picamera2()
            self.picam.configure(self.picam.create_preview_configuration(main={'size': (640, 480), 'format': 'RGB888'}))
            self.picam.start()
        else:
            source = os.environ.get('CAMERA_INDEX', '0')
            self.cap = cv2.VideoCapture(int(source) if source.isdigit() else source)
            if not self.cap.isOpened():
                self.cap.release()
                raise RuntimeError('Không mở được camera trên Raspberry Pi. Kiểm tra kết nối và CAMERA_INDEX.')
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        return self

    def read(self):
        if self.picam:
            return True, self.picam.capture_array()
        return self.cap.read()

    def __exit__(self, *_):
        if self.cap:
            self.cap.release()
        if self.picam:
            self.picam.stop()
            self.picam.close()
        if SHOW_PREVIEW:
            cv2.destroyAllWindows()


def process_image(operation, payload, image):
    if operation == 'ENCODE':
        return enroll(FaceRequest(image=image))
    if operation != 'VERIFY':
        raise RuntimeError('Thao tác model không được hỗ trợ.')
    return verify(VerifyRequest(image=image, embedding=payload['embedding']))


def process_job(job):
    operation, payload = job['operation'], job['payload']
    if payload.get('image'):
        return process_image(operation, payload, payload['image'])
    # Capture from the Pi itself. A browser cannot supply a driver ID or a match result.
    logger.info('Camera request %s for driver %s', operation, payload.get('driver_id', 'enrollment'))
    last_error = 'Không tìm thấy khuôn mặt rõ nét trước camera Raspberry Pi.'
    with Camera() as camera:
        deadline = time.monotonic() + CAPTURE_TIMEOUT
        frames = 0
        while time.monotonic() < deadline:
            ok, frame = camera.read()
            if not ok:
                time.sleep(0.1)
                continue
            frames += 1
            if SHOW_PREVIEW:
                cv2.imshow('DriverHub - Raspberry Pi', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    raise RuntimeError('Đã hủy nhận diện tại thiết bị.')
            if frames < 5 or frames % 3:
                continue
            small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            if len(face_recognition.face_locations(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))) != 1:
                continue
            ok, encoded = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
            if not ok:
                continue
            import base64
            image = 'data:image/jpeg;base64,' + base64.b64encode(encoded).decode('ascii')
            try:
                result = process_image(operation, payload, image)
                if operation == 'ENCODE' or result.get('matched'):
                    return result
                last_error = 'Khuôn mặt không khớp tài khoản đã đăng nhập. Vui lòng kiểm tra hồ sơ.'
            except HTTPException as error:
                last_error = str(error.detail)
    raise RuntimeError(last_error)


def run():
    if not DEVICE_KEY:
        raise SystemExit('Thiếu DEVICE_API_KEY trong ai_model/.env.')
    logger.info('Pi worker started: device=%s, backend=%s', DEVICE_ID, SERVER_URL)
    while True:
        try:
            job = cloud('GET', '/device/recognition/jobs')
            if not job:
                time.sleep(1)
                continue
            try:
                result = process_job(job)
                result['device_id'] = DEVICE_ID
                response = {'lease': job['lease'], 'result': result}
            except (HTTPException, Exception) as error:
                message = str(error.detail) if isinstance(error, HTTPException) else str(error)
                response = {'lease': job['lease'], 'error': message[:500]}
            cloud('POST', f"/device/recognition/jobs/{job['id']}/result", json=response)
            logger.info('Completed %s: %s', job['operation'], 'failed' if response.get('error') else 'success')
        except requests.RequestException:
            logger.warning('Chưa kết nối được backend. Thử lại sau 5 giây.')
            time.sleep(5)
        except Exception as error:
            logger.warning('%s', error)
            time.sleep(5)


if __name__ == '__main__':
    try:
        run()
    except KeyboardInterrupt:
        logger.info('Worker stopped.')
