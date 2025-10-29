const jwt = require('jsonwebtoken');
const database = require('../config/database');

// Middleware for JWT token authentication
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authorization header is required'
            });
        }

        const token = authHeader.startsWith('Bearer ') ? 
            authHeader.slice(7) : authHeader;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token is required'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded.userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid token format'
                });
            }

            // Get user details from database
            const result = await database.query(
                `SELECT user_id, email, first_name, last_name, role, status, last_login,
                        department_id, created_at, updated_at
                 FROM Users 
                 WHERE user_id = @userId AND status = 'active'`,
                { userId: decoded.userId }
            );

            if (result.recordset.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found or inactive'
                });
            }

            const user = result.recordset[0];

            // Update last login time
            await database.query(
                'UPDATE Users SET last_login = GETDATE() WHERE user_id = @userId',
                { userId: user.user_id }
            );

            // Add user info to request object
            req.user = {
                userId: user.user_id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                department: user.department_id,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                lastLoginAt: user.last_login
            };

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
            throw jwtError;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during authentication'
        });
    }
};

// Middleware for permission checking
const requirePermission = (permission) => {
    if (!permission) {
        throw new Error('Permission parameter is required');
    }

    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required'
                });
            }

            // Check permission in database
            const result = await database.execute('sp_CheckUserPermission', {
                UserId: req.user.userId,
                PermissionName: permission
            });

            const hasPermission = result.recordset[0]?.HasPermission > 0;

            if (!hasPermission) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Access denied: Requires '${permission}' permission`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error checking permissions'
            });
        }
    };
};

// Middleware for role checking
const requireRole = (roles) => {
    if (!Array.isArray(roles) || roles.length === 0) {
        throw new Error('Roles parameter must be a non-empty array');
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const hasRole = roles.includes(userRole);

        if (!hasRole) {
            return res.status(403).json({ 
                success: false, 
                message: `Access denied: Requires one of these roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

// Export middleware functions
module.exports = {
    authenticateToken,
    requirePermission,
    requireRole
};


module.exports = {
    authenticateToken,
    requirePermission,
    requireRole
};