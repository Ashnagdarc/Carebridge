// CareBridge: Auth guard logic that protects route access.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class HospitalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context) {
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    
    // Ensure this is a hospital token (not a patient token)
    if (user.type !== 'hospital') {
      throw new Error('Hospital token required');
    }
    
    return user;
  }
}
