import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
 
 ,

  ImportNotesSchema,
  type ImportNotesInput,
} from './dto/import-notes.schema';

@ApiTags('AI Processing')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiProcessingController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

   
     ,
 
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
        text: 'Cliente pediu dashboard por equipe. Relatou bug no filtro avançado que trava ao exportar.',
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
}
