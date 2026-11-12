import { CanActivate, ExecutionContext, ForbiddenException, HttpException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { AuthService, digest } from './auth.service';

export const Public = () => SetMetadata('auth:public', true);
export const Roles = (...roles: string[]) => SetMetadata('auth:roles', roles);
export const DeviceAllowed = () => SetMetadata('auth:device', true);
export const DeviceOnly = () => SetMetadata('auth:deviceOnly', true);

@Injectable()
export class AuthGuard implements CanActivate {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private reflector: Reflector, private auth: AuthService, private config: ConfigService) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    const get = <T>(name: string) => this.reflector.getAllAndOverride<T>(name, targets);
    const req = context.switchToHttp().getRequest();
    if (get<boolean>('auth:public')) {
      const now = Date.now();
      for (const [key, entry] of this.attempts) if (entry.until < now) this.attempts.delete(key);
      const key = `${req.ip}:${req.url.split('?')[0]}`;
      const entry = this.attempts.get(key) || { count: 0, until: now + 60000 };
      entry.count += 1;
      this.attempts.set(key, entry);
      if (entry.count > 10) throw new HttpException('Thao tác quá nhanh. Vui lòng thử lại sau một phút.', 429);
      return true;
    }
    const deviceOnly = get<boolean>('auth:deviceOnly');
    const supplied = req.headers['x-device-key'];
    const secret = this.config.get<string>('DEVICE_API_KEY');
    if ((deviceOnly || get<boolean>('auth:device')) && typeof supplied === 'string' && secret &&
      timingSafeEqual(Buffer.from(digest(supplied)), Buffer.from(digest(secret)))) {
      req.isDevice = true;
      return true;
    }
    if (deviceOnly) throw new UnauthorizedException('Thiết bị cần DEVICE_API_KEY hợp lệ.');
    req.user = await this.auth.authenticate((req.headers.authorization || '').replace(/^Bearer /, ''));
    const roles = get<string[]>('auth:roles') || ['admin'];
    if (!roles.includes(req.user.role)) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
    return true;
  }
}
