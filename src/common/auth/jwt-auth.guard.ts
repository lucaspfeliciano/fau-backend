import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from './authenticated-user.interface';
import { JWT_CONFIG } from './jwt.constants';

interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    const payload = this.verifyToken(token);
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const preferredOrganizationId = this.readOrganizationHeader(request);
    const userContext = await this.usersService.resolveUserContext(
      user.id,
      preferredOrganizationId,
    );

    if (!userContext) {
      throw new UnauthorizedException(
        'No organization membership found for this user.',
      );
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: userContext.organizationId,
      role: userContext.role,
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  private verifyToken(token: string): AccessTokenPayload {
    try {
      return this.jwtService.verify<AccessTokenPayload>(token, {
        secret: JWT_CONFIG.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private readOrganizationHeader(request: Request): string | undefined {
    const rawHeader = request.headers['x-organization-id'];

    if (Array.isArray(rawHeader)) {
      return rawHeader[0];
    }

    return rawHeader;
  }
}
