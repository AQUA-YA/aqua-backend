import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  AddressDto,
  UsersQueryDto,
  AdminUpdateUserDto,
} from './dto/user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/profile')
  @ApiOperation({ summary: 'Actualizar perfil propio' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/avatar')
  @ApiOperation({ summary: 'Actualizar avatar' })
  updateAvatar(
    @CurrentUser('sub') userId: string,
    @Body() body: { file: string },
  ) {
    return this.usersService.updateAvatar(userId, body.file);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Agregar dirección' })
  addAddress(@CurrentUser('sub') userId: string, @Body() dto: AddressDto) {
    return this.usersService.addAddress(userId, dto);
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Editar dirección' })
  updateAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId', ParseObjectIdPipe) addressId: string,
    @Body() dto: AddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @ApiOperation({ summary: 'Eliminar dirección' })
  removeAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId', ParseObjectIdPipe) addressId: string,
  ) {
    return this.usersService.removeAddress(userId, addressId);
  }

  @Post('me/roles/purifier')
  @ApiOperation({ summary: 'Activar rol purificador' })
  addPurifierRole(@CurrentUser('sub') userId: string) {
    return this.usersService.addRole(userId, Role.PURIFIER);
  }

  @Post('me/roles/delivery')
  @ApiOperation({ summary: 'Activar rol repartidor' })
  addDeliveryRole(@CurrentUser('sub') userId: string) {
    return this.usersService.addRole(userId, Role.DELIVERY);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista de usuarios (admin)' })
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detalle de usuario (admin)' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario (admin)' })
  adminUpdate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Restaurar usuario (admin)' })
  restore(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.restore(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.remove(id);
  }
}
