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

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({
  description: 'Insufficient permissions (Admin role required)',
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
  @ApiOperation({
    summary: 'List users with optional filtering by role, status, or search',
  })
  @ApiOkResponse({
    type: [UserResponseDto],
    description: 'List of registered users',
  })
  async listUsers(@Query() query: UserQueryDto): Promise<UserResponseDto[]> {
    const role = query.role ? parseRole(query.role) : undefined;
    const users = await this.listUsersUseCase.execute({
      role,
      isActive: query.isActive,
      search: query.search,
    });
    return users.map(UserResponseDto.fromDomain);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account with an assigned role' })
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'User successfully created',
  })
  @ApiConflictResponse({ description: 'Email is already registered' })
  @ApiBadRequestResponse({ description: 'Validation error on input fields' })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const role = parseRole(dto.role);
    const user = await this.createUserUseCase.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role,
    });
    return UserResponseDto.fromDomain(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve detailed information of a specific user' })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'User found',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.getUserUseCase.execute(id);
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update allowed profile fields of a user' })
  @ApiOkResponse({
    type: UserResponseDto,
    description: 'User profile updated',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateUserUseCase.execute({
      id,
      name: dto.name,
      image: dto.image,
    });
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id/role')
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
  @ApiOperation({
    summary:
      'Activate or deactivate user account without deleting business history',
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
  ): Promise<UserResponseDto> {
    const user = await this.setUserStatusUseCase.execute({
      id,
      isActive: dto.isActive,
    });
    return UserResponseDto.fromDomain(user);
  }
}
