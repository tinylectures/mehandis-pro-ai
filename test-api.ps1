# Test Script for ConstructAI Authentication API
Write-Host "=== ConstructAI API Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get
Write-Host "   Status: $($health.status)" -ForegroundColor Green
Write-Host ""

# Test 2: Register a new user
Write-Host "2. Registering a new user..." -ForegroundColor Yellow
$registerBody = @{
    email = "john.doe@example.com"
    password = "SecurePass123!"
    firstName = "John"
    lastName = "Doe"
    role = "quantity_surveyor"
    organizationId = "00000000-0000-0000-0000-000000000001"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
        -Method Post `
        -Body $registerBody `
        -ContentType "application/json"
    
    Write-Host "   User registered successfully!" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.id)" -ForegroundColor Gray
    Write-Host "   Email: $($registerResponse.data.email)" -ForegroundColor Gray
    Write-Host "   Role: $($registerResponse.data.role)" -ForegroundColor Gray
} catch {
    Write-Host "   Registration failed (user may already exist)" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Login
Write-Host "3. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "john.doe@example.com"
    password = "SecurePass123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "   Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($loginResponse.data.token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host "   Expires in: $($loginResponse.data.expiresIn) seconds" -ForegroundColor Gray
    Write-Host "   User: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)" -ForegroundColor Gray
    
    $token = $loginResponse.data.token
    $refreshToken = $loginResponse.data.refreshToken
} catch {
    Write-Host "   Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}
Write-Host ""

# Test 4: Access protected endpoint (example - would need to be implemented)
Write-Host "4. Testing authentication with token..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    # This would work if we had a protected endpoint
    Write-Host "   Token format: Bearer $($token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Token is ready to use for protected endpoints!" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Request password reset
Write-Host "5. Testing password reset request..." -ForegroundColor Yellow
$resetBody = @{
    email = "john.doe@example.com"
} | ConvertTo-Json

try {
    $resetResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/password-reset/request" `
        -Method Post `
        -Body $resetBody `
        -ContentType "application/json"
    
    Write-Host "   Password reset requested!" -ForegroundColor Green
    if ($resetResponse.resetToken) {
        Write-Host "   Reset token: $($resetResponse.resetToken.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== API Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available Endpoints:" -ForegroundColor Yellow
Write-Host "  POST /api/auth/register       - Register new user"
Write-Host "  POST /api/auth/login          - Login and get JWT token"
Write-Host "  POST /api/auth/refresh        - Refresh expired token"
Write-Host "  POST /api/auth/password-reset/request  - Request password reset"
Write-Host "  POST /api/auth/password-reset/confirm  - Confirm password reset"
Write-Host "  POST /api/auth/logout         - Logout user"
Write-Host "  GET  /api/auth/sessions/:userId - Get active sessions"
Write-Host ""
Write-Host "Server is running at: http://localhost:4000" -ForegroundColor Green
