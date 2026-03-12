import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Pharmacy from '../models/Pharmacy';
import { pharmacyProtect } from '../middleware/pharmacyAuth';
import Prescription from '../models/Prescription';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────
function generatePharmacyToken(pharmacyId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = (process.env.JWT_EXPIRE || '7d') as any;
  return jwt.sign({ userId: pharmacyId, email, role: 'pharmacy' }, secret, { expiresIn });
}

function pharmacyPublicData(p: any) {
  return {
    id: p._id,
    name: p.name,
    email: p.email,
    ownerName: p.ownerName,
    licenseNumber: p.licenseNumber,
    phone: p.phone || null,
    address: p.address || null,
    city: p.city || null,
    state: p.state || null,
    pincode: p.pincode || null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    openTime: p.openTime || null,
    closeTime: p.closeTime || null,
    workingDays: p.workingDays || [],
    onboardingCompleted: p.onboardingCompleted,
  };
}

// ── POST /api/pharmacy/signup ─────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('name').notEmpty().withMessage('Pharmacy name is required'),
    body('ownerName').notEmpty().withMessage('Owner name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be ≥ 6 characters'),
    body('licenseNumber').notEmpty().withMessage('License number is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
      return;
    }

    try {
      const { name, ownerName, email, password, phone, licenseNumber } = req.body;

      const existing = await Pharmacy.findOne({ email });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email already registered' });
        return;
      }

      const existingLicense = await Pharmacy.findOne({ licenseNumber });
      if (existingLicense) {
        res.status(400).json({ success: false, message: 'License number already registered' });
        return;
      }

      const pharmacy = await Pharmacy.create({ name, ownerName, email, password, phone, licenseNumber });
      const token = generatePharmacyToken(pharmacy._id.toString(), pharmacy.email);

      res.status(201).json({ success: true, token, pharmacy: pharmacyPublicData(pharmacy) });
    } catch (error: any) {
      console.error('Pharmacy signup error:', error);
      res.status(500).json({ success: false, message: 'Error creating account' });
    }
  }
);

// ── POST /api/pharmacy/login ──────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    try {
      const { email, password } = req.body;

      const pharmacy = await Pharmacy.findOne({ email }).select('+password');
      if (!pharmacy || !pharmacy.isActive) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const match = await pharmacy.comparePassword(password);
      if (!match) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const token = generatePharmacyToken(pharmacy._id.toString(), pharmacy.email);
      res.json({ success: true, token, pharmacy: pharmacyPublicData(pharmacy) });
    } catch (error: any) {
      console.error('Pharmacy login error:', error);
      res.status(500).json({ success: false, message: 'Error logging in' });
    }
  }
);

// ── GET /api/pharmacy/me ──────────────────────────────────────────────────────
router.get('/me', pharmacyProtect, async (req: any, res: Response): Promise<void> => {
  try {
    res.json({ success: true, pharmacy: pharmacyPublicData(req.pharmacy) });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── PUT /api/pharmacy/onboarding ─────────────────────────────────────────────
// Called after signup to set location + operating hours
router.put(
  '/onboarding',
  pharmacyProtect,
  [
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('state').notEmpty().withMessage('State is required'),
    body('pincode').notEmpty().withMessage('Pincode is required'),
    body('openTime').notEmpty().withMessage('Opening time is required'),
    body('closeTime').notEmpty().withMessage('Closing time is required'),
  ],
  async (req: any, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    try {
      const {
        address, city, state, pincode,
        latitude, longitude,
        openTime, closeTime,
        workingDays, phone,
      } = req.body;

      const pharmacy = await Pharmacy.findByIdAndUpdate(
        req.pharmacy._id,
        {
          address, city, state, pincode,
          ...(latitude != null ? { latitude: parseFloat(latitude) } : {}),
          ...(longitude != null ? { longitude: parseFloat(longitude) } : {}),
          openTime, closeTime,
          workingDays: workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          ...(phone ? { phone } : {}),
          onboardingCompleted: true,
        },
        { new: true }
      );

      res.json({ success: true, pharmacy: pharmacyPublicData(pharmacy) });
    } catch (error: any) {
      console.error('Pharmacy onboarding error:', error);
      res.status(500).json({ success: false, message: 'Error saving onboarding data' });
    }
  }
);

// ── PUT /api/pharmacy/profile ─────────────────────────────────────────────────
router.put('/profile', pharmacyProtect, async (req: any, res: Response): Promise<void> => {
  try {
    const allowed = ['name', 'ownerName', 'phone', 'address', 'city', 'state', 'pincode', 'latitude', 'longitude', 'openTime', 'closeTime', 'workingDays'];
    const update: any = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const pharmacy = await Pharmacy.findByIdAndUpdate(req.pharmacy._id, update, { new: true });
    res.json({ success: true, pharmacy: pharmacyPublicData(pharmacy) });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/prescriptions/incoming', pharmacyProtect, async (req: any, res: Response): Promise<void> => {
  try {
    const prescriptions = await Prescription.find({ pharmacyId: req.pharmacy._id })
      .sort({ sentAt: -1 })
      .populate('doctorId', 'firstName lastName specialization')
      .populate('patientId', 'firstName lastName phone address city state pincode')
      .populate('appointmentId', 'scheduledAt status');

    res.json({
      success: true,
      data: prescriptions.map((item: any) => ({
        id: item._id,
        medications: item.medications,
        instructions: item.instructions || '',
        status: item.status,
        sentAt: item.sentAt,
        dispensedAt: item.dispensedAt || null,
        doctor: item.doctorId
          ? {
              name: `Dr. ${item.doctorId.firstName} ${item.doctorId.lastName}`,
              specialization: item.doctorId.specialization || 'Doctor',
            }
          : null,
        patient: item.patientId
          ? {
              name: `${item.patientId.firstName} ${item.patientId.lastName}`,
              phone: item.patientId.phone || '',
              address: item.patientId.address || '',
              city: item.patientId.city || '',
              state: item.patientId.state || '',
              pincode: item.patientId.pincode || '',
            }
          : null,
        appointment: item.appointmentId
          ? {
              scheduledAt: item.appointmentId.scheduledAt,
              status: item.appointmentId.status,
            }
          : null,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching incoming prescriptions', error: error.message });
  }
});

router.put('/prescriptions/:prescriptionId/dispense', pharmacyProtect, async (req: any, res: Response): Promise<void> => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findOneAndUpdate(
      {
        _id: prescriptionId,
        pharmacyId: req.pharmacy._id,
      },
      {
        status: 'dispensed',
        dispensedAt: new Date(),
      },
      { new: true }
    );

    if (!prescription) {
      res.status(404).json({ success: false, message: 'Prescription not found' });
      return;
    }

    res.json({ success: true, message: 'Prescription marked as dispensed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating prescription status', error: error.message });
  }
});

export default router;
