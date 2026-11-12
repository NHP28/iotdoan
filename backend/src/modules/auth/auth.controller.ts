import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DriverProfileDto, LoginDto, RegisterDto, RoleDto } from './auth.dto';
import { Public, Roles } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Public() @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Public() @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Roles('admin', 'user', 'driver') @Get('me') me(@Req() req) { return this.auth.me(req.user); }
  @Roles('admin', 'user', 'driver') @Post('logout') logout(@Req() req) { return this.auth.logout(req.headers.authorization.replace(/^Bearer /, '')); }
  @Roles('user') @Post('driver-profile') registerDriver(@Req() req, @Body() dto: DriverProfileDto) { return this.auth.registerDriver(req.user, dto); }
  @Get('accounts') accounts() { return this.auth.listAccounts(); }
  @Patch('accounts/:id/role') setRole(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: RoleDto) { return this.auth.setRole(req.user, id, dto.role); }
}
