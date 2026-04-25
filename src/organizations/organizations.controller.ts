import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { CreateOrganizationSchema } from './dto/create-organization.schema';
import { OrganizationsService } from './organizations.service';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateOrganizationInput } from './dto/create-organization.schema';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization for the current user' })
  @ApiBody({ schema: { example: { name: 'Acme Corp' } } })
  @ApiCreatedResponse({ description: 'Organization created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateOrganizationSchema))
    body: CreateOrganizationInput,
  ) {
    return this.organizationsService.createForUser(body.name, user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current organization context for user' })
  @ApiOkResponse({
    description: 'Returns organization and role in current context.',
  })
  @ApiNotFoundResponse({ description: 'No organization found for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.organizationsService.getCurrentForUser(user.id);

    if (!result) {
      throw new NotFoundException(
        'No organization found for the current user.',
      );
    }

    return result;
  }
}
