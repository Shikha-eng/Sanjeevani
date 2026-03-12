import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Pharmacy from '../models/Pharmacy';

export const pharmacyProtect = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded: any = jwt.verify(token, secret);

    if (decoded.role !== 'pharmacy') {
      res.status(403).json({ success: false, message: 'Not a pharmacy token' });
      return;
    }

    const pharmacy = await Pharmacy.findById(decoded.userId);
    if (!pharmacy || !pharmacy.isActive) {
      res.status(401).json({ success: false, message: 'Pharmacy not found or inactive' });
      return;
    }

    req.pharmacy = pharmacy;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
