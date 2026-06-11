import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { customAlphabet } from 'nanoid';
import { User } from '../users/schemas/user.schema';
import {
  RegisterDto,
  VerifyCodeDto,
  SetPasswordDto,
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MAIL_PROVIDER } from '../../providers/providers.module';
import type { MailProvider } from '../../providers/providers.module';
import {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_TTL_MIN,
} from '../../common/constants/business.constants';

const nanoid = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  VERIFICATION_CODE_LENGTH,
);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProvider,
  ) {}

  private generateTokens(user: {
    _id: string;
    email: string;
    roles: string[];
  }) {
    const payload = { sub: user._id, email: user.email, roles: user.roles };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
      } as any),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      } as any),
    };
  }

  private sanitizeUser(user: any) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.passwordHash;
    delete obj.verificationCode;
    delete obj.verificationCodeExpiresAt;
    delete obj.deletedAt;
    return obj;
  }

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();
    if (existing) {
      if (existing.isVerified) {
        throw new ConflictException('El correo ya está registrado');
      }
      const code = nanoid();
      existing.verificationCode = code;
      existing.verificationCodeExpiresAt = new Date(
        Date.now() + VERIFICATION_CODE_TTL_MIN * 60 * 1000,
      );
      await existing.save();
      await this.mailProvider.sendVerificationCode(dto.email, code);
      return { message: 'Código de verificación reenviado' };
    }

    const referralCode = `AQUA-${customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6)()}`;
    const code = nanoid();
    await this.userModel.create({
      email: dto.email,
      isVerified: false,
      referralCode,
      verificationCode: code,
      verificationCodeExpiresAt: new Date(
        Date.now() + VERIFICATION_CODE_TTL_MIN * 60 * 1000,
      ),
    });
    await this.mailProvider.sendVerificationCode(dto.email, code);
    return { message: 'Código de verificación enviado' };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+verificationCode +verificationCodeExpiresAt')
      .exec();
    if (
      !user ||
      user.verificationCode !== dto.code ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código inválido o expirado');
    }
    return { message: 'Código válido' };
  }

  async setPassword(dto: SetPasswordDto) {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+verificationCode +verificationCodeExpiresAt')
      .exec();
    if (
      !user ||
      user.verificationCode !== dto.code ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código inválido o expirado');
    }

    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.isVerified = true;
    user.verificationCode = null as any;
    user.verificationCodeExpiresAt = null as any;
    await user.save();

    const tokens = this.generateTokens({
      _id: (user._id as unknown as string).toString(),
      email: user.email,
      roles: user.roles,
    });
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+passwordHash')
      .exec();
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (user.isSuspended) {
      throw new ForbiddenException('Tu cuenta está suspendida');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const tokens = this.generateTokens({
      _id: (user._id as unknown as string).toString(),
      email: user.email,
      roles: user.roles,
    });
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || (user as any).deletedAt || user.isSuspended) {
        throw new UnauthorizedException('Token inválido');
      }
      const tokens = this.generateTokens({
        _id: (user._id as unknown as string).toString(),
        email: user.email,
        roles: user.roles,
      });
      return tokens;
    } catch {
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (user) {
      const code = nanoid();
      user.verificationCode = code;
      user.verificationCodeExpiresAt = new Date(
        Date.now() + VERIFICATION_CODE_TTL_MIN * 60 * 1000,
      );
      await user.save();
      await this.mailProvider.sendVerificationCode(dto.email, code);
    }
    return {
      message: 'Si el correo existe, recibirás un código de verificación',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+verificationCode +verificationCodeExpiresAt')
      .exec();
    if (
      !user ||
      user.verificationCode !== dto.code ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código inválido o expirado');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.verificationCode = null as any;
    user.verificationCodeExpiresAt = null as any;
    await user.save();

    const tokens = this.generateTokens({
      _id: (user._id as unknown as string).toString(),
      email: user.email,
      roles: user.roles,
    });
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this.sanitizeUser(user);
  }
}
