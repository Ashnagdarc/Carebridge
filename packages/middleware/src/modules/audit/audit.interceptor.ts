import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const method = request.method;
    const path = request.path;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Extract actor from JWT token (if available)
    let actor = 'anonymous';
    let actorId = 'unknown';
    let actorType = 'unknown';

    if (request.user) {
      const user = request.user as any;
      if (user.hospitalId) {
        actor = `hospital:${user.code}`;
        actorId = user.hospitalId;
        actorType = 'hospital';
      } else if (user.patientId) {
        actor = `patient:${user.externalId}`;
        actorId = user.patientId;
        actorType = 'patient';
      }
    }

    // Skip logging for health checks and static assets
    if (this.shouldSkipLogging(path)) {
      return next.handle();
    }

    // Extract resource info from path
    const resourceType = this.auditService.formatResourceType(path);
    const action = this.auditService.formatAction(method, path);

    // Capture request body and mask sensitive data
    const maskedBody = request.body
      ? this.auditService.maskSensitiveData({ body: request.body })
      : null;

    return next.handle().pipe(
      tap((res) => {
        // Log successful request
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 400;

        const auditData: any = {
          action,
          resourceType,
          resourceId: this.extractResourceId(path, request.body, res),
          details: JSON.stringify(
            {
              method,
              path,
              statusCode,
              actor,
              duration: `${duration}ms`,
              requestBody: maskedBody?.body,
              requestQuery: request.query,
            },
            null,
            2,
          ),
          ipAddress,
          userAgent,
          status: isSuccess ? 'success' : 'failed',
        };

        if (actorType === 'patient') {
          auditData.patientId = actorId;
        } else if (actorType === 'hospital') {
          auditData.hospitalId = actorId;
        } else {
          // Try to extract from response
          const patientId = this.extractPatientId(path, res);
          const hospitalId = this.extractHospitalId(path, res);
          if (patientId) auditData.patientId = patientId;
          if (hospitalId) auditData.hospitalId = hospitalId;
        }

        this.auditService.createAuditLog(auditData).catch((err) => {
          console.error('Failed to create audit log:', err);
        });
      }),
      catchError((error) => {
        // Log failed request
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        const auditData: any = {
          action,
          resourceType,
          resourceId: this.extractResourceId(path, request.body, null),
          details: JSON.stringify(
            {
              method,
              path,
              statusCode,
              actor,
              duration: `${duration}ms`,
              error: error.message,
              requestBody: maskedBody?.body,
              requestQuery: request.query,
            },
            null,
            2,
          ),
          ipAddress,
          userAgent,
          status: 'failed',
        };

        if (actorType === 'patient') {
          auditData.patientId = actorId;
        } else if (actorType === 'hospital') {
          auditData.hospitalId = actorId;
        }

        this.auditService.createAuditLog(auditData).catch((err) => {
          console.error('Failed to create audit log:', err);
        });

        throw error;
      }),
    );
  }

  /**
   * Determine if path should skip logging
   */
  private shouldSkipLogging(path: string): boolean {
    const skipPaths = [
      '/health',
      '/.well-known',
      '/static',
      '/favicon.ico',
      '/metrics',
      '/debug',
    ];

    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Extract resource ID from various sources
   */
  private extractResourceId(path: string, body: any, response: any): string {
    // Try to get from URL params
    const pathMatch = path.match(/\/(\w+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Try to get from response ID
    if (response?.id) {
      return response.id;
    }

    // Try to get from request body
    if (body?.id) {
      return body.id;
    }

    // Try to get from path
    return path.split('/').filter((p) => p)[path.split('/').length - 1] || 'unknown';
  }

  /**
   * Extract patient ID from various sources
   */
  private extractPatientId(path: string, response: any): string | undefined {
    if (response?.patient?.id) {
      return response.patient.id;
    }
    if (response?.patientId) {
      return response.patientId;
    }
    return undefined;
  }

  /**
   * Extract hospital ID from various sources
   */
  private extractHospitalId(path: string, response: any): string | undefined {
    if (response?.hospital?.id) {
      return response.hospital.id;
    }
    if (response?.hospitalId) {
      return response.hospitalId;
    }
    return undefined;
  }
}
