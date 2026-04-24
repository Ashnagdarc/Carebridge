import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '@src/common/prisma/prisma.service';

function extractPatientTokenFromCookie(req: any): string | null {
  // cookie-parser populates req.cookies
  const token = req?.cookies?.carebridge_access_token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, 'patient-jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is required');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractPatientTokenFromCookie,
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: secret,
    });
  }

  async validate(req: any, payload: any) {
    if (payload.type !== 'patient') {
      throw new UnauthorizedException('Invalid token type');
    }

    const token =
      ExtractJwt.fromAuthHeaderAsBearerToken()(req) || extractPatientTokenFromCookie(req);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        patientId: payload.patientId,
        token: createHash('sha256').update(token).digest('hex'),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or revoked session');
    }

    return {
      patientId: payload.patientId,
      email: payload.email,
      externalId: payload.externalId,
      type: payload.type,
    };
  }
}
