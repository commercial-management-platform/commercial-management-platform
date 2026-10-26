import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js';
import { AuthUser } from '../domain/entities/auth-user.entity.js';
import { AuthGuard } from '../infrastructure/guards/auth.guard.js';
import { CurrentUser } from '../infrastructure/decorators/current-user.decorator.js';
import { Public } from '../infrastructure/decorators/public.decorator.js';
import { LoginDto } from './dtos/login.dto.js';
import { AuthResponseDto } from './dtos/auth-response.dto.js';
import { UserProfileDto } from './dtos/user-profile.dto.js';
import { LogoutResponseDto } from './dtos/logout-response.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'User authenticated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive account',
  })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.loginUseCase.execute(dto);

    res.cookie('better-auth.session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return {
      token: result.token,
      user: UserProfileDto.fromDomain(result.user),
    };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate current session and sign out' })
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Session invalidated successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    const cookieToken = (req.cookies as Record<string, string>)?.[
      'better-auth.session_token'
    ];
    const token = bearerToken || cookieToken || '';

    await this.logoutUseCase.execute(token);

    res.clearCookie('better-auth.session_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify session and obtain current user identity and role',
  })
  @ApiOkResponse({
    type: UserProfileDto,
    description: 'Authenticated user profile and assigned role',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired session',
  })
  getProfile(@CurrentUser() user: AuthUser): UserProfileDto {
    return UserProfileDto.fromDomain(user);
  }
}
