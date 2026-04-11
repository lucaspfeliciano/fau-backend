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
import { LoginWithPasswordSchema } from './dto/login-with-password.schema';
import { LoginWithGoogleSchema } from './dto/login-with-google.schema';
import {
  RegisterWithPasswordSchema,
  type RegisterWithPasswordInput,
} from './dto/register-with-password.schema';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { LoginWithGoogleInput } from './dto/login-with-google.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('providers')
  @ApiOperation({ summary: 'List available authentication providers' })
  @ApiOkResponse({
    description: 'Returns enabled auth providers for login/signup screens.',
  })
  providers() {
    return {
      providers: ['google', 'password'],
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register account with email and password' })
  @ApiBody({
    schema: {
      example: {
        email: 'admin@example.com',
        name: 'Admin Example',
        password: 'Senha@123',
        organizationName: 'Acme',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Returns access token and current organization context.',
  })
  registerWithPassword(@Body() body: unknown) {
    const input = RegisterWithPasswordSchema.parse(
      body,
    ) as RegisterWithPasswordInput;
    return this.authService.registerWithPassword(input);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({
    schema: {
      example: {
        email: 'admin@example.com',
        password: 'Senha@123',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Returns access token and current organization context.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  loginWithPassword(@Body() body: unknown) {
    const input = LoginWithPasswordSchema.parse(body);
    return this.authService.loginWithPassword(input);
  }

  @Post('google')
  @ApiOperation({ summary: 'Authenticate with Google profile payload' })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            googleId: { type: 'string', example: 'google-user-123456' },
            email: { type: 'string', example: 'admin@example.com' },
            name: { type: 'string', example: 'Admin Example' },
            organizationName: { type: 'string', example: 'Acme' },
          },
          required: ['googleId', 'email', 'name'],
        },
        {
          type: 'object',
          properties: {
            credential: { type: 'string', example: 'google-id-token' },
            organizationName: { type: 'string', example: 'Acme' },
          },
          required: ['credential'],
        },
      ],
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
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user);
  }
}
