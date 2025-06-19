import { DatabaseUser } from '../middleware/authMiddleware.js';
import {
  assignCardNumberHandler,
  assignPasswordHandler,
  debugMemberHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerInitialHandler,
  registerMemberHandler,
  searchMembersHandler,
} from './auth/auth.handlers.core.js';

// Extend Express Request to include user.
// This is kept in case any of the delegated handlers rely on `req.user`.
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

const authController = {
  // Core Auth Handlers
  login: loginHandler,
  refreshToken: refreshTokenHandler,
  logout: logoutHandler,

  // Registration Handlers
  registerInitial: registerInitialHandler,
  registerMember: registerMemberHandler,

  // Member Management Handlers
  searchMembers: searchMembersHandler,
  assignCardNumber: assignCardNumberHandler,
  assignPassword: assignPasswordHandler,
  debugMember: debugMemberHandler,
};

export default authController;