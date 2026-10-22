import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { ChangeContactStatusUseCase } from '../application/use-cases/change-contact-status.use-case.js';
import { CreateContactUseCase } from '../application/use-cases/create-contact.use-case.js';
import { GetContactUseCase } from '../application/use-cases/get-contact.use-case.js';
import { ListClientContactsUseCase } from '../application/use-cases/list-client-contacts.use-case.js';
import { UpdateContactUseCase } from '../application/use-cases/update-contact.use-case.js';
import type { ContactActor } from '../application/types/contact-actor.js';
import { ChangeContactStatusDto } from './dtos/change-contact-status.dto.js';
import { ContactResponseDto } from './dtos/contact-response.dto.js';
import { CreateContactDto } from './dtos/create-contact.dto.js';
import { UpdateContactDto } from './dtos/update-contact.dto.js';

function toActor(user: AuthUser): ContactActor {
  return { id: user.id, role: user.role };
}

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('clients/:clientId/contacts')
export class ContactsController {
  constructor(
    private readonly createContact: CreateContactUseCase,
    private readonly listClientContacts: ListClientContactsUseCase,
    private readonly getContact: GetContactUseCase,
    private readonly updateContact: UpdateContactUseCase,
    private readonly changeContactStatus: ChangeContactStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Register a contact of a client (admin and director only)',
  })
  @ApiCreatedResponse({
    type: ContactResponseDto,
    description: 'Contact created successfully',
  })
  @ApiBadRequestResponse({
    description:
      'Validation error on input fields, or the contact would have no phone, mobile or email',
  })
  @ApiNotFoundResponse({ description: 'Client does not exist or not visible' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can create contacts',
  })
  @ApiConflictResponse({
    description:
      'The client already has a primary contact (concurrent request)',
  })
  async create(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContactResponseDto> {
    const contact = await this.createContact.execute({
      actor: toActor(user),
      clientId,
      name: dto.name,
      jobTitle: dto.jobTitle,
      phone: dto.phone,
      mobile: dto.mobile,
      email: dto.email,
      isPrimary: dto.isPrimary,
    });
    return ContactResponseDto.fromDomain(contact);
  }

  @Get()
  @ApiOperation({
    summary:
      'List the contacts of a client. Advisors only see the clients on their routes',
  })
  @ApiOkResponse({
    type: [ContactResponseDto],
    description: 'Contacts of the client',
  })
  @ApiNotFoundResponse({ description: 'Client does not exist or not visible' })
  @ApiBadRequestResponse({ description: 'The client id is not a number' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async list(
    @Param('clientId', ParseIntPipe) clientId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.listClientContacts.execute({
      actor: toActor(user),
      clientId,
    });
    return contacts.map((contact) => ContactResponseDto.fromDomain(contact));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a contact of a client. A contact of another client answers as not found',
  })
  @ApiOkResponse({
    type: ContactResponseDto,
    description: 'Contact found',
  })
  @ApiNotFoundResponse({ description: 'Contact does not exist or not visible' })
  @ApiBadRequestResponse({ description: 'An id is not a number' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async getById(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<ContactResponseDto> {
    const contact = await this.getContact.execute({
      actor: toActor(user),
      clientId,
      contactId: id,
    });
    return ContactResponseDto.fromDomain(contact);
  }

  @Patch(':id')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary:
      'Update the allowed fields of a contact (admin and director only). Setting isPrimary demotes the previous primary contact',
  })
  @ApiOkResponse({
    type: ContactResponseDto,
    description: 'Contact updated successfully',
  })
  @ApiNotFoundResponse({ description: 'Contact does not exist or not visible' })
  @ApiBadRequestResponse({
    description:
      'Validation error on input fields, or the contact would have no phone, mobile or email',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can update contacts',
  })
  @ApiConflictResponse({
    description:
      'The client already has a primary contact (concurrent request)',
  })
  async update(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContactResponseDto> {
    const contact = await this.updateContact.execute({
      actor: toActor(user),
      clientId,
      contactId: id,
      data: dto,
    });
    return ContactResponseDto.fromDomain(contact);
  }

  @Patch(':id/status')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary:
      'Activate or deactivate a contact (admin and director only). Never deletes the contact',
  })
  @ApiOkResponse({
    type: ContactResponseDto,
    description: 'Contact status updated successfully',
  })
  @ApiNotFoundResponse({ description: 'Contact does not exist or not visible' })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({
    description: 'Only admin and director can change the contact status',
  })
  async changeStatus(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeContactStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContactResponseDto> {
    const contact = await this.changeContactStatus.execute({
      actor: toActor(user),
      clientId,
      contactId: id,
      active: dto.active,
    });
    return ContactResponseDto.fromDomain(contact);
  }
}
