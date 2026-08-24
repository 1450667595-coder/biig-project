import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: { email: string; password: string; nickname?: string }) {
    return this.authService.register(dto.email, dto.password, dto.nickname);
  }

  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  async me(@Req() req) {
    return req.user || { id: 'demo', email: 'demo@biiig.ai' };
  }
}
