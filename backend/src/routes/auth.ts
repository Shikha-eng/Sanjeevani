import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import User from '../models/User';
import { sendTokenResponse } from '../utils/auth';
import { validate } from '../middleware/validate';
import { protect } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (doctor or patient)
 * @access  Public
 */
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role')
      .isIn(['doctor', 'patient'])
      .withMessage('Role must be either doctor or patient'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        email,
        password,
        role,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        address,
        specialization,
        licenseNumber,
        experience,
        consultationFee,
        bloodGroup,
        allergies,
        medicalHistory,
      } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }
      
      // Check if license number already exists (for doctors)
      if (role === 'doctor' && licenseNumber) {
        const existingLicense = await User.findOne({ licenseNumber });
        if (existingLicense) {
          res.status(400).json({
            success: false,
            message: 'License number already registered',
          });
          return;
        }
      }
      
      // Create user object based on role
      const userData: any = {
        email,
        password,
        role,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        address,
      };
      
      // Add doctor-specific fields
      if (role === 'doctor') {
        userData.specialization = specialization;
        userData.licenseNumber = licenseNumber;
        userData.experience = experience;
        userData.consultationFee = consultationFee;
      }
      
      // Add patient-specific fields
      if (role === 'patient') {
        userData.bloodGroup = bloodGroup;
        userData.allergies = allergies;
        userData.medicalHistory = medicalHistory;
      }
      
      // Create user
      const user = await User.create(userData);
      
      // Send token response
      sendTokenResponse(user, 201, res);
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (doctor or patient)
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      // Find user by email and include password
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
        return;
      }
      
      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Your account has been deactivated',
        });
        return;
      }
      
      // Check password
      const isPasswordMatch = await user.comparePassword(password);
      
      if (!isPasswordMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
        return;
      }
      
      // Send token response
      sendTokenResponse(user, 200, res);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging in',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', protect, async (req: any, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/update-profile',
  protect,
  async (req: any, res: Response): Promise<void> => {
    try {
      const fieldsToUpdate: any = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        dateOfBirth: req.body.dateOfBirth,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      };
      
      // Add role-specific fields
      if (req.user.role === 'doctor') {
        fieldsToUpdate.specialization = req.body.specialization;
        fieldsToUpdate.experience = req.body.experience;
        fieldsToUpdate.consultationFee = req.body.consultationFee;
      } else if (req.user.role === 'patient') {
        fieldsToUpdate.bloodGroup = req.body.bloodGroup;
        fieldsToUpdate.allergies = req.body.allergies;
        fieldsToUpdate.medicalHistory = req.body.medicalHistory;
      }
      
      // Remove undefined fields
      Object.keys(fieldsToUpdate).forEach(
        key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
      );
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        fieldsToUpdate,
        {
          new: true,
          runValidators: true,
        }
      );
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  async (req: any, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user._id).select('+password');
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }
      
      // Check current password
      const isMatch = await user.comparePassword(req.body.currentPassword);
      
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
        return;
      }
      
      // Update password
      user.password = req.body.newPassword;
      await user.save();
      
      sendTokenResponse(user, 200, res);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error changing password',
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/auth/onboarding
 * @desc    Complete patient onboarding
 * @access  Private (Patient only)
 */
router.put(
  '/onboarding',
  protect,
  [
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('state').optional().isString(),
    body('pincode').optional().isString(),
    body('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    body('longitude').optional().isFloat().withMessage('Longitude must be a number'),
    body('phone').optional().isString(),
    body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('height').optional().isNumeric().withMessage('Height must be a number'),
    body('weight').optional().isNumeric().withMessage('Weight must be a number'),
    body('hasDiabetes').optional().isBoolean(),
    body('hasBloodPressure').optional().isBoolean(),
  ],
  validate,
  async (req: any, res: Response): Promise<void> => {
    try {
      // Only patients can complete onboarding
      if (req.user.role !== 'patient') {
        res.status(403).json({
          success: false,
          message: 'Only patients can complete onboarding',
        });
        return;
      }

      const {
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        phone,
        bloodGroup,
        height,
        weight,
        hasDiabetes,
        hasBloodPressure,
      } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        {
          address,
          city,
          state,
          pincode,
          latitude,
          longitude,
          phone,
          bloodGroup,
          height,
          weight,
          hasDiabetes,
          hasBloodPressure,
          onboardingCompleted: true,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      res.status(200).json({
        success: true,
        message: 'Onboarding completed successfully',
        data: user,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error completing onboarding',
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/auth/doctor-onboarding
 * @desc    Complete doctor onboarding
 * @access  Private (Doctor only)
 */
router.put(
  '/doctor-onboarding',
  protect,
  [
    body('phone').notEmpty().withMessage('Contact number is required'),
    body('address').notEmpty().withMessage('Clinic location is required'),
    body('city').optional().isString(),
    body('state').optional().isString(),
    body('pincode').optional().isString(),
    body('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    body('longitude').optional().isFloat().withMessage('Longitude must be a number'),
    body('specialization').optional().isString(),
    body('licenseNumber').optional().isString(),
    body('experience').optional().isNumeric().withMessage('Experience must be a number'),
    body('consultationFee').optional().isNumeric().withMessage('Consultation fee must be a number'),
  ],
  validate,
  async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user.role !== 'doctor') {
        res.status(403).json({
          success: false,
          message: 'Only doctors can complete this onboarding',
        });
        return;
      }

      const {
        phone,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        specialization,
        licenseNumber,
        experience,
        consultationFee,
      } = req.body;

      if (licenseNumber) {
        const existingLicense = await User.findOne({
          licenseNumber,
          _id: { $ne: req.user._id },
        });

        if (existingLicense) {
          res.status(400).json({
            success: false,
            message: 'License number already registered',
          });
          return;
        }
      }

      const fieldsToUpdate: any = {
        phone,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        onboardingCompleted: true,
      };

      if (specialization !== undefined) fieldsToUpdate.specialization = specialization;
      if (licenseNumber !== undefined) fieldsToUpdate.licenseNumber = licenseNumber;
      if (experience !== undefined) fieldsToUpdate.experience = experience;
      if (consultationFee !== undefined) fieldsToUpdate.consultationFee = consultationFee;

      const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        message: 'Doctor onboarding completed successfully',
        data: user,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error completing doctor onboarding',
        error: error.message,
      });
    }
  }
);

export default router;
