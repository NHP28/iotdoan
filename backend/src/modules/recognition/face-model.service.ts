import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecognitionQueueService } from './recognition-queue.service';

@Injectable()
export class FaceModelService {
  constructor(private config: ConfigService, private queue: RecognitionQueueService) {}
  async status() {
      const deviceId = this.config.get('RECOGNITION_DEVICE_ID') || 'raspi_cam_01';
      const devices = await this.queue.devices();
      let enrollmentAvailable = false;
      try {
        const response = await fetch(`${this.config.get('AI_MODEL_URL') || 'http://127.0.0.1:8000'}/health`, { signal: AbortSignal.timeout(2000) });
        enrollmentAvailable = response.ok;
      } catch {}
      return { mode: 'raspberry', enrollment_mode: 'local', enrollment_available: enrollmentAvailable, device_id: deviceId,
        devices, available: devices.some(d => d.device_id === deviceId && d.online) };
  }
  async verifyOnPi(payload: { embedding: number[]; device_id?: string; driver_id: number; driver_name: string; check_type: string }) {
    const deviceId = payload.device_id || this.config.get('RECOGNITION_DEVICE_ID') || 'raspi_cam_01';
    const result = await this.queue.request(deviceId, 'VERIFY', payload);
    return { ...result, device_id: deviceId };
  }
  async request(path: string, body?: object, timeoutMs = 30000) {
    let response: Response;
    try {
      response = await fetch(`${this.config.get('AI_MODEL_URL') || 'http://127.0.0.1:8000'}${path}`, {
        method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs),
      });
    } catch { throw new ServiceUnavailableException('Chưa kết nối được model nhận diện. Vui lòng khởi động dịch vụ AI.'); }
    let result;
    try { result = await response.json(); }
    catch { throw new ServiceUnavailableException('Model trả về phản hồi không hợp lệ.'); }
    if (!response.ok) throw new BadRequestException(typeof result.detail === 'string' ? result.detail : 'Không thể xử lý ảnh. Vui lòng chọn ảnh có đúng một khuôn mặt rõ nét.');
    return result;
  }
  async encodeSamples(images?: string[]) {
    if (!images?.length) throw new BadRequestException('Vui lòng tải ảnh hoặc quay video khuôn mặt trên web.');
    const result = await this.request('/enroll-batch', { images });
    const vector = (value: unknown): value is number[] => Array.isArray(value) && value.length === 128 && value.every(Number.isFinite);
    const avatar = (value: unknown): value is string => typeof value === 'string' && value.length < 250_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
    const samples = result.samples || [{ embedding: result.embedding, avatar: result.avatar }];
    if (!vector(result.embedding) || !avatar(result.avatar) || !Array.isArray(samples) ||
        samples.length !== (images?.length || 1) || samples.some(sample => !vector(sample.embedding) || !avatar(sample.avatar))) {
      throw new ServiceUnavailableException('Model chưa trả về đầy đủ mẫu khuôn mặt hợp lệ. Chưa lưu đăng ký.');
    }
    return { face_embedding: JSON.stringify(result.embedding), avatar_url: result.avatar as string,
      samples: samples as { embedding: number[]; avatar: string }[] };
  }
  async preview(image: string, pose: 'front' | 'left' | 'right') {
    const result = await this.request('/preview', { image, pose }, 6000);
    const box = result.box;
    if (typeof result.acceptable !== 'boolean' || !Number.isInteger(result.face_count) || result.face_count < 0 ||
        typeof result.message !== 'string' || typeof result.code !== 'string' || result.pose !== pose ||
        (box !== null && (!box || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(box[key]) && box[key] >= 0 && box[key] <= 1))) ||
        (result.acceptable && (result.face_count !== 1 || !box || result.code !== 'ready'))) {
      throw new ServiceUnavailableException('Phản hồi kiểm tra camera không hợp lệ. Vui lòng thử lại.');
    }
    // Never return biometric vectors or accept a driver ID from the browser.
    return { acceptable: result.acceptable, face_count: result.face_count, code: result.code,
      message: result.message, pose: result.pose, box };
  }
}
