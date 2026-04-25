import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { CreateTeamSchema } from './dto/create-team.schema';
import { UpdateTeamSchema } from './dto/update-team.schema';
import { TeamsService } from './teams.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateTeamInput } from './dto/create-team.schema';
import type { UpdateTeamInput } from './dto/update-team.schema';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a team in the current organization' })
  @ApiBody({ schema: { example: { name: 'Support Team' } } })
  @ApiCreatedResponse({ description: 'Team created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow team creation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @Roles(Role.Admin, Role.Editor)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateTeamSchema))
    body: CreateTeamInput,
  ) {
    return this.teamsService.create(body.name, user.organizationId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List teams for current organization' })
  @ApiOkResponse({ description: 'Returns teams for current tenant.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return {
      items: await this.teamsService.listByOrganization(user.organizationId),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team in the current organization' })
  @ApiBody({ schema: { example: { name: 'Product Ops Team' } } })
  @ApiOkResponse({ description: 'Team updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow team updates.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @Roles(Role.Admin, Role.Editor)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema))
    body: UpdateTeamInput,
  ) {
    return this.teamsService.update(
      id,
      body.name,
      user.organizationId,
      user.id,
    );
  }
}
