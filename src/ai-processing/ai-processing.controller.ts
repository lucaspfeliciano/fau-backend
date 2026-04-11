import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AiProcessingService } from './ai-processing.service';
import {
  ApproveReviewQueueBatchSchema,
  type ApproveReviewQueueBatchInput,
} from './dto/approve-review-queue-batch.schema';
import {
  ImportNotesSchema,
  type ImportNotesInput,
} from './dto/import-notes.schema';
import {
  MatchSimilarRequestsSchema,
  type MatchSimilarRequestsInput,
} from './dto/match-similar-requests.schema';
import {
  QueryReviewQueueSchema,
  type QueryReviewQueueInput,
} from './dto/query-review-queue.schema';

@ApiTags('AI Processing')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiProcessingController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

  @Post('requests/import-notes')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({
    summary:
      'Import notes and convert unstructured input into structured requests',
  })
  @ApiBody({
    schema: {
      example: {
        sourceType: 'meeting-notes',
        noteExternalId: 'meet-2026-04-10-001',
        text: 'Cliente pediu dashboard por equipe. Relatou bug no filtro avancado que trava ao exportar.',
        timeoutMs: 1200,
      },
    },
  })
  @ApiCreatedResponse({ description: 'Notes processed successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  importNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ImportNotesSchema)) body: ImportNotesInput,
  ) {
    return this.aiProcessingService.importNotes(body, user);
  }

  @Post('requests/match-similar')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Match semantic similar requests for dedupe flow' })
  @ApiBody({
    schema: {
      example: {
        text: 'Cliente pediu dashboard por equipe com filtro por squad.',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Similar matches returned.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  matchSimilarRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(MatchSimilarRequestsSchema))
    body: MatchSimilarRequestsInput,
  ) {
    return this.aiProcessingService.matchSimilarRequests(body, user);
  }

  @Get('requests/review-queue')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'List AI review queue items' })
  @ApiOkResponse({ description: 'Returns review queue items.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  listReviewQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryReviewQueueSchema))
    query: QueryReviewQueueInput,
  ) {
    return this.aiProcessingService.listReviewQueue(query, user.organizationId);
  }

  @Post('requests/review-queue/approve-batch')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Approve AI review queue items in batch' })
  @ApiBody({
    schema: {
      example: {
        itemIds: ['queue-item-1', 'queue-item-2'],
      },
    },
  })
  @ApiCreatedResponse({ description: 'Batch approval executed.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  approveReviewQueueBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ApproveReviewQueueBatchSchema))
    body: ApproveReviewQueueBatchInput,
  ) {
    return this.aiProcessingService.approveReviewQueueBatch(body, user);
  }

  @Post('requests/review-queue/:itemId/approve')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Approve an AI review queue item' })
  @ApiCreatedResponse({ description: 'Queue item approved.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  approveReviewQueueItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    return this.aiProcessingService.approveReviewQueueItem(itemId, user);
  }

  @Post('requests/review-queue/:itemId/reject')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Reject an AI review queue item' })
  @ApiCreatedResponse({ description: 'Queue item rejected.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  rejectReviewQueueItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    return this.aiProcessingService.rejectReviewQueueItem(itemId, user);
  }

  @Get('quality-metrics')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Get AI ingestion quality metrics' })
  @ApiCreatedResponse({ description: 'AI quality metrics returned.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getQualityMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.aiProcessingService.getQualityMetrics(user.organizationId);
  }
}
