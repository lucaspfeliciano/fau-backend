import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { DomainEventsService } from '../common/events/domain-events.service';
import { QueryUsersSchema } from './dto/query-users.schema';
import { UpdateRoleSchema } from './dto/update-role.schema';
import { UsersService } from './users.service';
import type { QueryUsersInput } from './dto/query-users.schema';
import type { UpdateRoleInput } from './dto/update-role.schema';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List users in current organization' })
  @ApiOkResponse({ description: 'Returns paginated users.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryUsersSchema)) query: QueryUsersInput,
  ) {
    return this.usersService.listByOrganization(user.organizationId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      role: query.role,
    });
  }

  @Patch(':id/role')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update user role in current organization' })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiBody({
    schema: {
      example: {
        role: 'Editor',
      },
    },
  })
  @ApiOkResponse({ description: 'Role updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) body: UpdateRoleInput,
  ) {
    try {
      const result = await this.usersService.updateMembershipRole(
        id,
        actor.organizationId,
        body.role as Role,
      );

      this.domainEventsService.publish({
        name: 'user.role_changed',
        occurredAt: result.updatedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          targetUserId: id,
          newRole: body.role,
          changedBy: actor.id,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'USER_NOT_FOUND') {
          throw new NotFoundException('User not found.');
        }

        if (error.message === 'USER_NOT_IN_ORGANIZATION') {
          throw new NotFoundException(
            'User is not a member of this organization.',
          );
        }

        if (error.message === 'CANNOT_REMOVE_LAST_ADMIN') {
          throw new BadRequestException(
            'Cannot remove the last admin from the organization.',
          );
        }
      }

      throw error;
    }
  }
}
