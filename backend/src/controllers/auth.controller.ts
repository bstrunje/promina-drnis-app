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
  twoFaInitSetup,
  twoFaConfirmSetup,
  twoFaVerify,
  twoFaDisable,
  twoFaInitOtp,
} from './auth/auth.handlers.core.js';

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

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

  // 2FA Handlers
  twoFaInitSetup,
  twoFaConfirmSetup,
  twoFaVerify,
  twoFaDisable,
  twoFaInitOtp,
};

export default authController;