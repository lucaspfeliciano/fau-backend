import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { EngineeringService } from './engineering.service';

@ApiTags('Engineering Compatibility')
@ApiBearerAuth()
@Controller('products/features')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EngineeringProductCompatController {
  constructor(private readonly engineeringService: EngineeringService) {}

  @Get(':featureId/tasks')
  @ApiOperation({ summary: 'List tasks linked to feature' })
  @ApiParam({ name: 'featureId', description: 'Feature id' })
  @ApiOkResponse({ description: 'Returns tasks for selected feature.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listTasksByFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('featureId') featureId: string,
  ) {
    return {
      items: await this.engineeringService.listTasksByFeature(
        featureId,
        user.organizationId,
      ),
    };
  }
}
