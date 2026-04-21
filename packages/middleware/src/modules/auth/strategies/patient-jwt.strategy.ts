import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, 'patient-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_jwt_secret_key',
    });
  }

  validate(payload: any) {
    if (payload.type !== 'patient') {
      throw new Error('Invalid token type');
    }
    return {
      patientId: payload.patientId,
      email: payload.email,
      externalId: payload.externalId,
      type: payload.type,
    };
  }
}
