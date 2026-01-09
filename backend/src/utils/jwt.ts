import jwt from 'jsonwebtoken';
import config from '../config';

export const generateToken = (payload: { id: string; email: string }): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): { id: string; email: string } => {
  return jwt.verify(token, config.jwt.secret) as { id: string; email: string };
};

