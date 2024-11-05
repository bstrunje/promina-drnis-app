// src/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import db from '../utils/db.js';

// Main authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database with their role
    const result = await db.query(
      `SELECT u.*, r.role_name 
       FROM users u
       JOIN user_roles ur ON u.user_id = ur.user_id
       JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1 AND u.is_active = true`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Attach user to request object
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role checking middleware
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!allowedRoles.includes(req.user.role_name)) {
        return res.status(403).json({ 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role checking error:', error);
      res.status(500).json({ message: 'Error checking user role' });
    }
  };
};

// Super user check middleware
const requireSuperUser = async (req, res, next) => {
  try {
    if (req.user.role_name !== 'super_user') {
      return res.status(403).json({ 
        message: 'Access denied. Super user privileges required.' 
      });
    }
    next();
  } catch (error) {
    console.error('Super user check error:', error);
    res.status(500).json({ message: 'Error checking super user status' });
  }
};

export { authMiddleware, checkRole, requireSuperUser };