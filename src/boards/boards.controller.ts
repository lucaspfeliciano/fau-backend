import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { BoardsService } from './boards.service';
import { CreateBoardSchema } from './dto/create-board.schema';
import { QueryBoardsSchema } from './dto/query-boards.schema';
import { UpdateBoardSchema } from './dto/update-board.schema';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateBoardInput } from './dto/create-board.schema';
import type { QueryBoardsInput } from './dto/query-boards.schema';
import type { UpdateBoardInput } from './dto/update-board.schema';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller('boards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: 'List boards' })
  @ApiOkResponse({ description: 'Returns paginated boards.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryBoardsSchema)) query: QueryBoardsInput,
  ) {
    return this.boardsService.list(query, user.organizationId);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create board' })
  @ApiBody({
    schema: {
      example: {
        name: 'Suporte Enterprise',
        description: 'Board para feedbacks de contas enterprise.',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Board created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateBoardSchema)) body: CreateBoardInput,
  ) {
    return {
      board: await this.boardsService.create(body, user),
    };
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update board by id' })
  @ApiParam({ name: 'id', description: 'Board id' })
  @ApiBody({
    schema: {
      example: {
        name: 'Suporte SMB',
      },
    },
  })
  @ApiOkResponse({ description: 'Board updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBoardSchema)) body: UpdateBoardInput,
  ) {
    return {
      board: await this.boardsService.update(id, body, user),
    };
  }
}
