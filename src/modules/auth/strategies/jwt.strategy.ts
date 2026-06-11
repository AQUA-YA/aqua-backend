import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }) {
    const user = await this.userModel
      .findById(payload.sub)
      .select('isSuspended deletedAt')
      .exec();
    if (!user || (user as any).deletedAt) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (user.isSuspended) {
      throw new UnauthorizedException('Tu cuenta está suspendida');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
