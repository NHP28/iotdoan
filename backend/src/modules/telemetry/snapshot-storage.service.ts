import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

@Injectable()
export class SnapshotStorageService {
  private readonly root: string;
  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('UPLOAD_DIR') || join(process.cwd(), 'uploads'));
  }

  async save(driverId: number, image: string) {
    if (!Number.isSafeInteger(driverId) || driverId < 1) throw new BadRequestException('Ảnh cảnh báo cần có driver_id hợp lệ.');
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
    if (!match) throw new BadRequestException('Ảnh cần có định dạng data URL JPG, PNG hoặc WebP.');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 3_000_000 || bytes.toString('base64') !== match[2]) throw new BadRequestException('Ảnh không hợp lệ hoặc vượt quá 3 MB.');
    const valid = match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!valid) throw new BadRequestException('Nội dung ảnh không khớp định dạng đã gửi.');
    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const filename = `${randomUUID()}.${extension}`;
    const directory = join(this.root, 'drivers', String(driverId), 'alerts');
    await mkdir(directory, { recursive: true });
    const path = join(directory, filename);
    await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
    return { path, url: `/api/v1/telemetry/snapshots/${driverId}/${filename}` };
  }

  async remove(path: string) { await unlink(path).catch(() => undefined); }

  async read(driverId: number, filename: string) {
    if (!Number.isSafeInteger(driverId) || driverId < 1 || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/.test(filename)) {
      throw new NotFoundException('Không tìm thấy ảnh cảnh báo.');
    }
    const path = join(this.root, 'drivers', String(driverId), 'alerts', filename);
    try { if (!(await stat(path)).isFile()) throw new Error(); }
    catch { throw new NotFoundException('Không tìm thấy ảnh cảnh báo.'); }
    const type = filename.endsWith('.jpg') ? 'image/jpeg' : filename.endsWith('.png') ? 'image/png' : 'image/webp';
    return { stream: createReadStream(path), type };
  }
}
