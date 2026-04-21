# Task 1.3: Patient Authentication - Quick Reference

## Quick Test with cURL

### Signup
```bash
curl -X POST http://localhost:3000/patients/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/patients/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePassword123"
  }'
```

### Get Profile (Protected)
```bash
curl -X GET http://localhost:3000/patients/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/patients/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

### Logout (Protected)
```bash
curl -X POST http://localhost:3000/patients/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Key Methods

### PatientsService
```typescript
signup(dto: PatientSignupDto): Promise<PatientAuthResponseDto>
login(dto: PatientLoginDto): Promise<PatientAuthResponseDto>
refresh(dto: PatientRefreshDto): Promise<PatientAuthResponseDto>
logout(patientId: string, token: string): Promise<void>
getPatientProfile(patientId: string): Promise<PatientProfile>
```

### PatientsController
- POST /patients/signup → signup()
- POST /patients/login → login()
- POST /patients/refresh → refresh()
- POST /patients/logout → logout() [Protected]
- GET /patients/profile → getProfile() [Protected]

## Guard Usage
```typescript
@UseGuards(PatientJwtAuthGuard)
async someProtectedMethod(@Request() req: any) {
  // req.user contains: { patientId, email, externalId, type }
}
```

## Validation DTOs
All DTOs use class-validator decorators:
- @IsEmail() for email fields
- @MinLength(8) for passwords
- @IsString() for string fields

## Security Constants
- Password hash rounds: 10 (bcrypt)
- Access token TTL: 86400 seconds (24 hours)
- Refresh token TTL: 2592000 seconds (30 days)
- Signature algorithm: HS256

## Error Codes
- 400: Missing/invalid fields
- 401: Invalid credentials or missing token
- 409: Email already exists
- 201: Success

## Test Commands
```bash
# Run all tests
npm run test

# Run patient tests only
npm run test -- patients.service.spec.ts

# Run E2E tests
npm run test:e2e -- patients.e2e-spec.ts

# Watch mode
npm run test:watch
```

## Database
- Patient table: id, email, passwordHash, externalId, firstName, lastName
- Session table: patientId, token, refreshToken, expiresAt, revokedAt
- All relationships use CASCADE delete

## Environment Setup
```env
JWT_SECRET=dev_jwt_secret_key
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=2592000
```

## Common Issues

**"Invalid credentials"**
- Wrong password OR email not found
- Check email and password match signup

**"Invalid refresh token"**
- Token expired or revoked
- Must match refreshToken from signup/login response

**"Missing required fields"**
- Check all required fields present: email, password, firstName, lastName
- password minimum 8 characters

**401 on profile endpoint**
- Missing Authorization header
- Invalid or expired accessToken
- Try refreshing token with refresh endpoint

---

**Reference:** Task 1.3 (Patient Authentication)
**Status:** ✅ Complete (Iteration 1/3)
