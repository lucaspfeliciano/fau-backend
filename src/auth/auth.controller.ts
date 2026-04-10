import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AuthService } from './auth.service';
import { LoginWithGoogleSchema } from './dto/login-with-google.schema';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { LoginWithGoogleInput } from './dto/login-with-google.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @ApiOperation({ summary: 'Authenticate with Google profile payload' })
  @ApiBody({
    schema: {
      example: {
        googleId: 'google-user-123456',
        email: 'admin@example.com',
        name: 'Admin Example',
        organizationName: 'Acme',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Returns access token and current organization context.',
  })
  loginWithGoogle(
    @Body(new ZodValidationPipe(LoginWithGoogleSchema))
    body: LoginWithGoogleInput,
  ) {
    return this.authService.loginWithGoogle(body);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return authenticated user profile and context' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Returns authenticated user data and current organization.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user);
  }
}
