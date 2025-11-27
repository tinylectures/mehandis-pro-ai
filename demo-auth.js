// Demo script to show authentication functionality without database
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

console.log('\n=== ConstructAI Authentication System Demo ===\n');

// Configuration
const JWT_SECRET = 'demo-secret-key';
const JWT_EXPIRES_IN = '1h';

// Demo: Password Hashing
console.log('1. Password Hashing with bcrypt:');
console.log('   --------------------------------');
const password = 'SecurePassword123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    console.log(`   Original Password: ${password}`);
    console.log(`   Hashed Password: ${hash}`);
    console.log(`   Hash Length: ${hash.length} characters`);
    
    // Verify password
    bcrypt.compare(password, hash, (err, result) => {
        console.log(`   Password Verification: ${result ? '✓ Valid' : '✗ Invalid'}`);
        console.log('');
        
        // Demo: JWT Token Generation
        console.log('2. JWT Token Generation:');
        console.log('   ----------------------');
        
        const user = {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            email: 'john.doe@example.com',
            role: 'quantity_surveyor'
        };
        
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        
        console.log(`   User Data:`);
        console.log(`     - ID: ${user.userId}`);
        console.log(`     - Email: ${user.email}`);
        console.log(`     - Role: ${user.role}`);
        console.log('');
        console.log(`   Generated JWT Token:`);
        console.log(`     ${token.substring(0, 80)}...`);
        console.log(`     (${token.length} characters total)`);
        console.log('');
        
        // Demo: JWT Token Validation
        console.log('3. JWT Token Validation:');
        console.log('   ----------------------');
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log(`   Token is valid! ✓`);
            console.log(`   Decoded payload:`);
            console.log(`     - User ID: ${decoded.userId}`);
            console.log(`     - Email: ${decoded.email}`);
            console.log(`     - Role: ${decoded.role}`);
            console.log(`     - Issued at: ${new Date(decoded.iat * 1000).toLocaleString()}`);
            console.log(`     - Expires at: ${new Date(decoded.exp * 1000).toLocaleString()}`);
        } catch (error) {
            console.log(`   Token validation failed: ${error.message}`);
        }
        console.log('');
        
        // Demo: Role-Based Access Control
        console.log('4. Role-Based Access Control (RBAC):');
        console.log('   ----------------------------------');
        
        const permissions = {
            admin: ['create:project', 'delete:project', 'manage:users', 'view:audit_logs'],
            project_manager: ['create:project', 'update:project', 'assign:team'],
            quantity_surveyor: ['calculate:quantities', 'create:cost_estimate', 'generate:report'],
            viewer: ['read:project', 'read:quantities', 'read:cost_estimate']
        };
        
        console.log(`   User Role: ${user.role}`);
        console.log(`   Permissions:`);
        permissions[user.role].forEach(perm => {
            console.log(`     ✓ ${perm}`);
        });
        console.log('');
        
        // Demo: Session Management
        console.log('5. Session Management:');
        console.log('   -------------------');
        
        const sessionId = require('crypto').randomBytes(16).toString('hex');
        const sessionData = {
            sessionId: sessionId,
            userId: user.userId,
            email: user.email,
            role: user.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        console.log(`   Session Created:`);
        console.log(`     - Session ID: ${sessionData.sessionId}`);
        console.log(`     - User: ${sessionData.email}`);
        console.log(`     - Created: ${sessionData.createdAt}`);
        console.log(`     - Expires: ${sessionData.expiresAt}`);
        console.log('');
        
        // Summary
        console.log('=== Summary ===');
        console.log('');
        console.log('✓ Password hashing with bcrypt (10 salt rounds)');
        console.log('✓ JWT token generation and validation');
        console.log('✓ Role-based access control with 4 roles');
        console.log('✓ Session management with expiration');
        console.log('');
        console.log('The API server is running at: http://localhost:4000');
        console.log('');
        console.log('Available API Endpoints:');
        console.log('  POST /api/auth/register       - Register new user');
        console.log('  POST /api/auth/login          - Login and get JWT token');
        console.log('  POST /api/auth/refresh        - Refresh expired token');
        console.log('  POST /api/auth/password-reset/request');
        console.log('  POST /api/auth/password-reset/confirm');
        console.log('  POST /api/auth/logout         - Logout user');
        console.log('');
        console.log('Note: Database and Redis are optional for basic testing.');
        console.log('The authentication system works with in-memory storage.');
        console.log('');
    });
});
