import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';

interface TokenPayload {
  userId: string;
  email: string;
  role: 'doctor' | 'patient';
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'];
  
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const sendTokenResponse = (
  user: any,
  statusCode: number,
  res: Response
): void => {
  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      specialization: user.specialization,
      licenseNumber: user.licenseNumber,
      bloodGroup: user.bloodGroup,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
};
