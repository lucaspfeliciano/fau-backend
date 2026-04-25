import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreatePlaygroundHypothesisDto } from './dto/create-playground-hypothesis.dto';
import { CreatePlaygroundInsightDto } from './dto/create-playground-insight.dto';
import { CreateLegacyPlaygroundNodeDto } from './dto/create-legacy-playground-node.dto';
import { CreatePlaygroundWorkspaceDto } from './dto/create-playground-workspace.dto';
import { CreateLegacyBoardCardDto } from './dto/create-legacy-board-card.dto';
import { UpdateLegacyBoardCardDto } from './dto/update-legacy-board-card.dto';
import { QueryLegacyPlaygroundNodesDto } from './dto/query-legacy-playground-nodes.dto';
import { QueryPlaygroundAssetsDto } from './dto/query-playground-assets.dto';
import { QueryPlaygroundHypothesesDto } from './dto/query-playground-hypotheses.dto';
import { QueryPlaygroundInsightsDto } from './dto/query-playground-insights.dto';
import { QueryPlaygroundWorkspacesDto } from './dto/query-playground-workspaces.dto';
import { PromotePlaygroundInsightToRequestDto } from './dto/promote-playground-insight-to-request.dto';
import { UpdateLegacyPlaygroundNodeDto } from './dto/update-legacy-playground-node.dto';
import { UpdatePlaygroundHypothesisDto } from './dto/update-playground-hypothesis.dto';
import { UpdatePlaygroundInsightDto } from './dto/update-playground-insight.dto';
import { UpdatePlaygroundWorkspaceDto } from './dto/update-playground-workspace.dto';
import { UploadPlaygroundAssetDto } from './dto/upload-playground-asset.dto';
import { buildPlaygroundUploadOptions } from './playground-upload.config';
import { PlaygroundService } from './playground.service';
import { PlaygroundStorageService } from './storage/playground-storage.service';

const playgroundUploadOptions = buildPlaygroundUploadOptions(
  new PlaygroundStorageService(),
);

interface UploadedPlaygroundFile {
  originalname: string;
  filename: string;
  mimetype: string;
}

@ApiTags('Playground')
@ApiBearerAuth()
@Controller('playground')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlaygroundController {
  constructor(private readonly playgroundService: PlaygroundService) {}

  @Post('workspaces')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create playground workspace' })
  @ApiCreatedResponse({
    description: 'Playground workspace created successfully.',
  })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreatePlaygroundWorkspaceDto,
  ) {
    return this.playgroundService.createWorkspace(body, user);
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List playground workspaces' })
  @ApiOkResponse({ description: 'Returns paginated playground workspaces.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listWorkspaces(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryPlaygroundWorkspacesDto,
  ) {
    return this.playgroundService.listWorkspaces(query, user.organizationId);
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get playground workspace by id' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns playground workspace details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.playgroundService.getWorkspace(id, user.organizationId);
  }

  @Patch('workspaces/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update playground workspace by id' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Playground workspace updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdatePlaygroundWorkspaceDto,
  ) {
    return this.playgroundService.updateWorkspace(id, body, user);
  }

  @Delete('workspaces/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete playground workspace by id' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Playground workspace deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.playgroundService.deleteWorkspace(id, user);
    return {
      success: true,
    };
  }

  @Post('workspaces/:id/assets')
  @Roles(Role.Admin, Role.Editor)
  @UseInterceptors(FileInterceptor('file', playgroundUploadOptions))
  @ApiOperation({ summary: 'Upload playground evidence asset' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
          example: 'Screenshot from customer interview',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'Playground asset uploaded successfully.',
  })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async uploadAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UploadPlaygroundAssetDto,
    @UploadedFile() file: UploadedPlaygroundFile | undefined,
  ) {
    return this.playgroundService.uploadAsset(id, body, file, user);
  }

  @Get('workspaces/:id/assets')
  @ApiOperation({ summary: 'List assets for playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns paginated playground assets.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listAssets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryPlaygroundAssetsDto,
  ) {
    return this.playgroundService.listAssets(id, query, user.organizationId);
  }

  @Get('workspaces/:id/nodes')
  @ApiOperation({ summary: 'List legacy nodes from playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns paginated legacy nodes.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listLegacyNodes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryLegacyPlaygroundNodesDto,
  ) {
    return this.playgroundService.listLegacyNodes(
      id,
      query,
      user.organizationId,
    );
  }

  @Post('workspaces/:id/nodes')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create legacy node in playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiCreatedResponse({ description: 'Legacy node created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createLegacyNode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateLegacyPlaygroundNodeDto,
  ) {
    return this.playgroundService.createLegacyNode(id, body, user);
  }

  @Patch('nodes/:nodeId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update legacy node by id' })
  @ApiParam({ name: 'nodeId', description: 'Legacy node id' })
  @ApiOkResponse({ description: 'Legacy node updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateLegacyNode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('nodeId') nodeId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateLegacyPlaygroundNodeDto,
  ) {
    return this.playgroundService.updateLegacyNode(nodeId, body, user);
  }

  @Delete('nodes/:nodeId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete legacy node by id' })
  @ApiParam({ name: 'nodeId', description: 'Legacy node id' })
  @ApiOkResponse({ description: 'Legacy node deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteLegacyNode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('nodeId') nodeId: string,
  ) {
    await this.playgroundService.deleteLegacyNode(nodeId, user);
    return {
      success: true,
    };
  }

  @Get('workspaces/:id/board-cards')
  @ApiOperation({ summary: 'List legacy board cards for playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns paginated legacy board cards.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listLegacyBoardCards(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryPlaygroundHypothesesDto,
  ) {
    return this.playgroundService.listLegacyBoardCards(
      id,
      query,
      user.organizationId,
    );
  }

  @Get('workspaces/:id/cards')
  @ApiOperation({ summary: 'Fallback alias for legacy board cards' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns paginated legacy board cards.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listLegacyCardsAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryPlaygroundHypothesesDto,
  ) {
    return this.playgroundService.listLegacyBoardCards(
      id,
      query,
      user.organizationId,
    );
  }

  @Post('workspaces/:id/board-cards')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create legacy board card in playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiCreatedResponse({ description: 'Board card created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createLegacyBoardCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateLegacyBoardCardDto,
  ) {
    return this.playgroundService.createLegacyBoardCard(id, body, user);
  }

  @Patch('board-cards/:cardId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update legacy board card by id' })
  @ApiParam({ name: 'cardId', description: 'Board card id' })
  @ApiOkResponse({ description: 'Board card updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateLegacyBoardCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateLegacyBoardCardDto,
  ) {
    return this.playgroundService.updateLegacyBoardCard(cardId, body, user);
  }

  @Delete('board-cards/:cardId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete legacy board card by id' })
  @ApiParam({ name: 'cardId', description: 'Board card id' })
  @ApiOkResponse({ description: 'Board card deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteLegacyBoardCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
  ) {
    await this.playgroundService.deleteLegacyBoardCard(cardId, user);
    return { success: true };
  }

  @Post('board-cards/:cardId/convert-to-request')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Convert board card to a request' })
  @ApiParam({ name: 'cardId', description: 'Board card id' })
  @ApiCreatedResponse({ description: 'Request created from board card.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async convertBoardCardToRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    // The frontend may send the request payload nested under a `request` key
    const payload =
      typeof body.request === 'object' && body.request !== null
        ? (body.request as Record<string, unknown>)
        : body;

    return this.playgroundService.convertLegacyBoardCardToRequest(
      workspaceId ?? user.organizationId,
      cardId,
      {
        title: typeof payload.title === 'string' ? payload.title : undefined,
        description:
          typeof payload.description === 'string'
            ? payload.description
            : undefined,
        tags: Array.isArray(payload.tags)
          ? (payload.tags as string[])
          : undefined,
        sourceType:
          typeof payload.sourceType === 'string'
            ? payload.sourceType
            : undefined,
        boardId:
          typeof body.boardId === 'string'
            ? body.boardId
            : typeof payload.boardId === 'string'
              ? payload.boardId
              : undefined,
        problems: Array.isArray(payload.problems)
          ? (payload.problems as string[])
          : undefined,
        solutions: Array.isArray(payload.solutions)
          ? (payload.solutions as string[])
          : undefined,
        product:
          typeof payload.product === 'string' ? payload.product : undefined,
        functionality:
          typeof payload.functionality === 'string'
            ? payload.functionality
            : undefined,
        feedbackIds: Array.isArray(payload.feedbackIds)
          ? (payload.feedbackIds as string[])
          : undefined,
      },
      user,
    );
  }

  @Post('board-cards/:cardId/convert')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Convert board card to a request (alias)' })
  @ApiParam({ name: 'cardId', description: 'Board card id' })
  @ApiCreatedResponse({ description: 'Request created from board card.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async convertBoardCardToRequestAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    // The frontend may send the request payload nested under a `request` key
    const payload =
      typeof body.request === 'object' && body.request !== null
        ? (body.request as Record<string, unknown>)
        : body;

    return this.playgroundService.convertLegacyBoardCardToRequest(
      workspaceId ?? user.organizationId,
      cardId,
      {
        title: typeof payload.title === 'string' ? payload.title : undefined,
        description:
          typeof payload.description === 'string'
            ? payload.description
            : undefined,
        tags: Array.isArray(payload.tags)
          ? (payload.tags as string[])
          : undefined,
        sourceType:
          typeof payload.sourceType === 'string'
            ? payload.sourceType
            : undefined,
        boardId:
          typeof body.boardId === 'string'
            ? body.boardId
            : typeof payload.boardId === 'string'
              ? payload.boardId
              : undefined,
        problems: Array.isArray(payload.problems)
          ? (payload.problems as string[])
          : undefined,
        solutions: Array.isArray(payload.solutions)
          ? (payload.solutions as string[])
          : undefined,
        product:
          typeof payload.product === 'string' ? payload.product : undefined,
        functionality:
          typeof payload.functionality === 'string'
            ? payload.functionality
            : undefined,
        feedbackIds: Array.isArray(payload.feedbackIds)
          ? (payload.feedbackIds as string[])
          : undefined,
      },
      user,
    );
  }

  @Post('workspaces/:id/hypotheses')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create hypothesis in playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiCreatedResponse({
    description: 'Playground hypothesis created successfully.',
  })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createHypothesis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreatePlaygroundHypothesisDto,
  ) {
    return this.playgroundService.createHypothesis(id, body, user);
  }

  @Get('workspaces/:id/hypotheses')
  @ApiOperation({ summary: 'List hypotheses from playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns paginated playground hypotheses.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listHypotheses(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryPlaygroundHypothesesDto,
  ) {
    return this.playgroundService.listHypotheses(
      id,
      query,
      user.organizationId,
    );
  }

  @Get('hypotheses/:id')
  @ApiOperation({ summary: 'Get playground hypothesis by id' })
  @ApiParam({ name: 'id', description: 'Playground hypothesis id' })
  @ApiOkResponse({ description: 'Returns playground hypothesis details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getHypothesis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.playgroundService.getHypothesis(id, user.organizationId);
  }

  @Patch('hypotheses/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update playground hypothesis by id' })
  @ApiParam({ name: 'id', description: 'Playground hypothesis id' })
  @ApiOkResponse({ description: 'Playground hypothesis updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateHypothesis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdatePlaygroundHypothesisDto,
  ) {
    return this.playgroundService.updateHypothesis(id, body, user);
  }

  @Delete('hypotheses/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete playground hypothesis by id' })
  @ApiParam({ name: 'id', description: 'Playground hypothesis id' })
  @ApiOkResponse({ description: 'Playground hypothesis deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteHypothesis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.playgroundService.deleteHypothesis(id, user);
    return {
      success: true,
    };
  }

  @Post('workspaces/:id/insights')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create insight in playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiCreatedResponse({
    description: 'Playground insight created successfully.',
  })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreatePlaygroundInsightDto,
  ) {
    return this.playgroundService.createInsight(id, body, user);
  }

  @Get('workspaces/:id/insights')
  @ApiOperation({ summary: 'List insights from playground workspace' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiOkResponse({ description: 'Returns paginated playground insights.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryPlaygroundInsightsDto,
  ) {
    return this.playgroundService.listInsights(id, query, user.organizationId);
  }

  @Get('insights/:id')
  @ApiOperation({ summary: 'Get playground insight by id' })
  @ApiParam({ name: 'id', description: 'Playground insight id' })
  @ApiOkResponse({ description: 'Returns playground insight details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.playgroundService.getInsight(id, user.organizationId);
  }

  @Get('insights/:id/requests')
  @ApiOperation({ summary: 'List requests linked to playground insight' })
  @ApiParam({ name: 'id', description: 'Playground insight id' })
  @ApiOkResponse({ description: 'Returns requests linked to this insight.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listInsightRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      items: await this.playgroundService.listInsightRequests(
        id,
        user.organizationId,
      ),
    };
  }

  @Patch('insights/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update playground insight by id' })
  @ApiParam({ name: 'id', description: 'Playground insight id' })
  @ApiOkResponse({ description: 'Playground insight updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdatePlaygroundInsightDto,
  ) {
    return this.playgroundService.updateInsight(id, body, user);
  }

  @Post('workspaces/:id/insights/:insightId/promote-request')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Promote playground insight to request' })
  @ApiParam({ name: 'id', description: 'Playground workspace id' })
  @ApiParam({ name: 'insightId', description: 'Playground insight id' })
  @ApiCreatedResponse({ description: 'Request created from insight.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async promoteInsightToRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('insightId') insightId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: PromotePlaygroundInsightToRequestDto,
  ) {
    const result = await this.playgroundService.promoteInsightToRequest(
      id,
      insightId,
      body,
      user,
    );

    return {
      insight: result.insight,
      request: result.request,
    };
  }

  @Delete('insights/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete playground insight by id' })
  @ApiParam({ name: 'id', description: 'Playground insight id' })
  @ApiOkResponse({ description: 'Playground insight deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.playgroundService.deleteInsight(id, user);
    return {
      success: true,
    };
  }

  @Delete('assets/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete playground asset by id' })
  @ApiParam({ name: 'id', description: 'Playground asset id' })
  @ApiOkResponse({ description: 'Playground asset deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.playgroundService.deleteAsset(id, user);
    return {
      success: true,
    };
  }
}
