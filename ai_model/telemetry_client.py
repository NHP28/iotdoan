"""Send a DMS alert and its camera snapshot to the cloud backend.

Import DmsTelemetryClient in the DMS camera loop; pass the recognized driver_id.
The server saves the photo under uploads/drivers/<id>/alerts/ and returns its URL.
"""
import base64
import os
from pathlib import Path

import cv2
import requests


class DmsTelemetryClient:
    def __init__(self, server_url=None, device_id=None, device_key=None):
        config = {}
        env_path = Path(__file__).with_name('.env')
        if env_path.exists():
            for line in env_path.read_text(encoding='utf-8').splitlines():
                if '=' in line and not line.lstrip().startswith('#'):
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip().strip('"').strip("'")
        self.server_url = (server_url or os.environ.get('SERVER_URL') or config.get('SERVER_URL') or 'http://127.0.0.1:3000/api/v1').rstrip('/')
        if not self.server_url.endswith('/api/v1'):
            self.server_url += '/api/v1'
        self.device_id = device_id or os.environ.get('DEVICE_ID') or config.get('DEVICE_ID', 'raspi_cam_01')
        key = device_key or os.environ.get('DEVICE_API_KEY') or config.get('DEVICE_API_KEY')
        if not key:
            raise ValueError('Thiếu DEVICE_API_KEY để gửi cảnh báo.')
        self.session = requests.Session()
        self.session.headers.update({'x-device-key': key})

    def send_alert(self, driver_id, frame, *, drowsiness=False, distraction=False, yawn=False,
                   level='WARNING', eye_aspect_ratio=None, speed=None, head_pose=None):
        if not isinstance(driver_id, int) or driver_id < 1:
            raise ValueError('Cần driver_id của tài xế đã được nhận diện.')
        if level not in ('NORMAL', 'WARNING', 'CRITICAL'):
            raise ValueError('Mức cảnh báo không hợp lệ.')
        if frame is None or frame.size == 0:
            raise ValueError('Không có frame camera để gửi.')
        height, width = frame.shape[:2]
        scale = min(1, 1280 / max(width, height))
        if scale < 1:
            frame = cv2.resize(frame, (max(1, round(width * scale)), max(1, round(height * scale))))
        ok, encoded = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if not ok or encoded.nbytes > 3_000_000:
            raise ValueError('Không mã hóa được ảnh hoặc ảnh vượt quá 3 MB.')
        payload = {
            'device_id': self.device_id, 'driver_id': driver_id,
            'drowsiness_detected': bool(drowsiness), 'distraction_detected': bool(distraction),
            'yawn_detected': bool(yawn), 'alert_level': level,
            'snapshot_base64': 'data:image/jpeg;base64,' + base64.b64encode(encoded).decode('ascii'),
        }
        if eye_aspect_ratio is not None:
            payload['eye_aspect_ratio'] = float(eye_aspect_ratio)
        if speed is not None:
            payload['speed'] = float(speed)
        if head_pose is not None:
            payload['head_pose'] = str(head_pose)
        response = self.session.post(f'{self.server_url}/telemetry', json=payload, timeout=(5, 20))
        response.raise_for_status()
        return response.json()['data']
