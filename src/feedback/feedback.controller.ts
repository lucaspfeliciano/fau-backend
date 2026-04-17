import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create feedback' })
  @ApiCreatedResponse({ description: 'Feedback created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateFeedbackDto,
  ) {
    return {
      feedback: await this.feedbackService.create(body, user),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List feedback with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated feedback.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryFeedbackDto,
  ) {
    return this.feedbackService.list(query, user.organizationId);
  }
}
