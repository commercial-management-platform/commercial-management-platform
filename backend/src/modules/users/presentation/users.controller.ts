import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { AuthGuard } from '../../auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { GetUserUseCase } from '../application/use-cases/get-user.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { ChangeUserRoleUseCase } from '../application/use-cases/change-user-role.use-case.js';
import { SetUserStatusUseCase } from '../application/use-cases/set-user-status.use-case.js';
import { UserResponseDto } from './dtos/user-response.dto.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateUserDto } from './dtos/update-user.dto.js';
import { ChangeUserRoleDto } from './dtos/change-user-role.dto.js';
import { SetUserStatusDto } from './dtos/set-user-status.dto.js';
import { UserQueryDto } from './dtos/user-query.dto.js';
import { parseRole } from './dtos/role-helper.js';
import type { UserActor } from '../application/types/user-actor.js';

function toActor(user: AuthUser): UserActor {
  return { id: user.id, role: user.role };
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({
  description: 'Insufficient permissions (admin or director role required)',
})
@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changeUserRoleUseCase: ChangeUserRoleUseCase,
    private readonly setUserStatusUseCase: SetUserStatusUseCase,
  ) {}

  @Get()
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Admin: list users; director: list advisors only',
  })
  @ApiOkResponse({
    type: [UserResponseDto],
    description:
      'Admin: matching users. Director: advisors only; a non-advisor role filter returns an empty list.',
  })
  async listUsers(
    @Query() query: UserQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserResponseDto[]> {
    const role = query.role ? parseRole(query.role) : undefined;
    const users = await this.listUsersUseCase.execute(
      {
        role,
        isActive: query.isActive,
        search: query.search,
      },
      toActor(user),
    );
    return users.map(UserResponseDto.fromDomain);
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.Director)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin: create any allowed user; director: create advisors only',
  })
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'User successfully created; directors can create advisors only',
  })
  @ApiConflictResponse({ description: 'Email is already registered' })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserResponseDto> {
    const role = parseRole(dto.role);
    const user = await this.createUserUseCase.execute({
      actor: toActor(actor),
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role,
    });
    return UserResponseDto.fromDomain(user);
  }

  @Get(':id')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Retrieve a user; directors can access advisors only',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'User found',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserResponseDto> {
    const user = await this.getUserUseCase.execute(id, toActor(actor));
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary: 'Update profile fields; directors can update advisors only',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'User profile updated',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserResponseDto> {
    const user = await this.updateUserUseCase.execute({
      actor: toActor(actor),
      id,
      name: dto.name,
      image: dto.image,
    });
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id/role')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary:
      'Change role of a user (protected against leaving zero active admins)',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'User role changed successfully',
  })
  @ApiConflictResponse({
    description:
      'Cannot change role: the platform must have at least one active administrator',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid role' })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeUserRoleDto,
  ): Promise<UserResponseDto> {
    const role = parseRole(dto.role);
    const user = await this.changeUserRoleUseCase.execute({
      id,
      role,
    });
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.Admin, UserRole.Director)
  @ApiOperation({
    summary:
      'Activate/deactivate users; directors can manage advisors only',
  })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'User status updated successfully',
  })
  @ApiConflictResponse({
    description: 'Cannot deactivate the last active administrator',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async setStatus(
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserResponseDto> {
    const user = await this.setUserStatusUseCase.execute({
      actor: toActor(actor),
      id,
      isActive: dto.isActive,
    });
    return UserResponseDto.fromDomain(user);
  }
}
