import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import {
  UpdateProfileDto,
  AddressDto,
  UsersQueryDto,
  AdminUpdateUserDto,
} from './dto/user.dto';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { Role } from '../../common/interfaces/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.gender !== undefined) user.gender = dto.gender;

    if (dto.referralCode) {
      if (user.referredBy) {
        throw new BadRequestException('Ya usaste un código de referido');
      }
      if (dto.referralCode === user.referralCode) {
        throw new BadRequestException('No puedes usar tu propio código');
      }
      const referrer = await this.userModel
        .findOne({ referralCode: dto.referralCode })
        .exec();
      if (!referrer) {
        throw new BadRequestException('Código de referido inválido');
      }
      user.referredBy = (referrer._id as unknown as string).toString();
    }

    await user.save();
    return this.sanitizeUser(user);
  }

  async updateAvatar(userId: string, _file: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.avatarUrl = `https://storage.aquaya.mock/avatars/${userId}_${Date.now()}.jpg`;
    await user.save();
    return { avatarUrl: user.avatarUrl };
  }

  async addAddress(userId: string, dto: AddressDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.isPrimary) {
      user.addresses.forEach((a: any) => (a.isPrimary = false));
    }
    user.addresses.push(dto);
    await user.save();
    return user.addresses;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: Partial<AddressDto>,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const address = (user.addresses as any).id(addressId);
    if (!address) throw new NotFoundException('Dirección no encontrada');
    if (dto.isPrimary) {
      user.addresses.forEach((a: any) => (a.isPrimary = false));
    }
    Object.assign(address, dto);
    await user.save();
    return user.addresses;
  }

  async removeAddress(userId: string, addressId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const idx = user.addresses.findIndex(
      (a: any) => a._id && a._id.toString() === addressId,
    );
    if (idx === -1) throw new NotFoundException('Dirección no encontrada');
    user.addresses.splice(idx, 1);
    await user.save();
    return user.addresses;
  }

  async addRole(userId: string, role: Role) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      await user.save();
    }
    return this.sanitizeUser(user);
  }

  async findAll(query: UsersQueryDto): Promise<PaginatedResult<User>> {
    const {
      search,
      page = 1,
      limit = 20,
      includeDeleted = 'false',
      role,
    } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = softDeleteCondition(includeDeleted === 'true');

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) {
      filter.roles = role;
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitizeUser(user);
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.roles !== undefined) user.roles = dto.roles;
    if (dto.isSuspended !== undefined) user.isSuspended = dto.isSuspended;
    await user.save();
    return this.sanitizeUser(user);
  }

  async restore(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    (user as any).deletedAt = null;
    await user.save();
    return this.sanitizeUser(user);
  }

  async remove(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    (user as any).deletedAt = new Date();
    await user.save();
    return { message: 'Usuario eliminado' };
  }

  private sanitizeUser(user: any) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.passwordHash;
    delete obj.verificationCode;
    delete obj.verificationCodeExpiresAt;
    delete obj.deletedAt;
    return obj;
  }
}
