import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';

export { loginHandler } from './login.handler.js';
export { refreshTokenHandler } from './refreshToken.handler.js';
export { logoutHandler } from './logout.handler.js';
export { registerInitialHandler, registerMemberHandler } from './auth.handlers.registration.js';
export {
  searchMembersHandler,
  assignCardNumberHandler,
  assignPasswordHandler,
  debugMemberHandler,
} from './auth.handlers.member.js';