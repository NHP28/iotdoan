import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecognitionQueueService } from './recognition-queue.service';

@Injectable()
export class FaceModelService {
  constructor(private config: ConfigService, private queue: RecognitionQueueService) {}
  async status() {
    const mode = this.config.get('RECOGNITION_MODE') || 'raspberry';
    if (mode === 'raspberry') {
      const deviceId = this.config.get('RECOGNITION_DEVICE_ID') || 'raspi_cam_01';
      const devices = await this.queue.devices();
      return { mode, device_id: deviceId, devices, available: devices.some(d => d.device_id === deviceId && d.online) };
    }
    try { await this.request('/health'); return { mode, available: true }; }
    catch { return { mode, available: false }; }
  }
  async request(path: string, body?: object) {
    if ((this.config.get('RECOGNITION_MODE') || 'raspberry') === 'raspberry') {
      const payload = (body || {}) as Record<string, unknown>;
      const deviceId = typeof payload.device_id === 'string' ? payload.device_id : this.config.get('RECOGNITION_DEVICE_ID') || 'raspi_cam_01';
      const result = await this.queue.request(deviceId, path === '/encode' ? 'ENCODE' : 'VERIFY', payload);
      return { ...result, device_id: deviceId };
    }
    let response: Response;
    try {
      response = await fetch(`${this.config.get('AI_MODEL_URL') || 'http://127.0.0.1:8000'}${path}`, {
        method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000),
      });
    } catch { throw new ServiceUnavailableException('Chưa kết nối được model nhận diện. Vui lòng khởi động dịch vụ AI.'); }
    let result;
    try { result = await response.json(); }
    catch { throw new ServiceUnavailableException('Model trả về phản hồi không hợp lệ.'); }
    if (!response.ok) throw new BadRequestException(typeof result.detail === 'string' ? result.detail : 'Không thể xử lý ảnh. Vui lòng chọn ảnh có đúng một khuôn mặt rõ nét.');
    return result;
  }
  async encode(image?: string, deviceId?: string): Promise<{ face_embedding: string; avatar_url?: string }> {
    const result = await this.request('/encode', { image, device_id: deviceId });
    if (!Array.isArray(result.embedding) || result.embedding.length !== 128 || !result.embedding.every(Number.isFinite)) {
      throw new ServiceUnavailableException('Model trả về vector khuôn mặt không hợp lệ.');
    }
    const avatar = typeof result.avatar === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(result.avatar) && result.avatar.length < 60000 ? result.avatar : undefined;
    return { face_embedding: JSON.stringify(result.embedding), ...(avatar ? { avatar_url: avatar } : {}) };
  }
}
