import { Router, Response } from 'express';
import { protect } from '../middleware/auth';
import Appointment from '../models/Appointment';
import DoctorRating from '../models/DoctorRating';
import User from '../models/User';
import Pharmacy from '../models/Pharmacy';

const router = Router();

const isWithinBookingHours = (date: Date): boolean => {
  const hours = date.getHours();
  return hours >= 9 && hours < 17;
};

const toRad = (value: number): number => (value * Math.PI) / 180;

const distanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

router.get('/doctors', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({ success: false, message: 'Only patients can access doctors list' });
      return;
    }

    const nearbyOnly = req.query.nearby === 'true';
    const maxDistanceKm = Number(req.query.maxDistanceKm || 20);

    const doctors = await User.find({
      role: 'doctor',
      isActive: true,
      onboardingCompleted: true,
    }).select('firstName lastName specialization averageRating totalRatings city state latitude longitude');

    const patient = await User.findById(req.user._id).select('latitude longitude');
    const patientHasCoords =
      patient && typeof patient.latitude === 'number' && typeof patient.longitude === 'number';

    const mappedDoctors = doctors.map((doctor) => {
      let computedDistance: number | null = null;
      if (
        patientHasCoords &&
        typeof doctor.latitude === 'number' &&
        typeof doctor.longitude === 'number'
      ) {
        computedDistance = distanceKm(
          patient!.latitude as number,
          patient!.longitude as number,
          doctor.latitude,
          doctor.longitude
        );
      }

      return {
        id: doctor._id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization || 'General Physician',
        averageRating: doctor.averageRating || 0,
        totalRatings: doctor.totalRatings || 0,
        city: doctor.city || '',
        state: doctor.state || '',
        distanceKm: computedDistance !== null ? parseFloat(computedDistance.toFixed(1)) : null,
      };
    });

    const filteredDoctors = nearbyOnly
      ? mappedDoctors
          .filter((doctor) => doctor.distanceKm !== null && (doctor.distanceKm as number) <= maxDistanceKm)
          .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number))
      : mappedDoctors;

    res.status(200).json({
      success: true,
      data: filteredDoctors,
      patientHasLocation: Boolean(patientHasCoords),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message,
    });
  }
});

router.get('/pharmacies/nearby', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({ success: false, message: 'Only patients can access nearby pharmacies' });
      return;
    }

    const maxDistanceKm = Number(req.query.maxDistanceKm || 20);
    const patient = await User.findById(req.user._id).select('latitude longitude city state');

    const patientHasCoords =
      patient && typeof patient.latitude === 'number' && typeof patient.longitude === 'number';

    const pharmacies = await Pharmacy.find({
      isActive: true,
      onboardingCompleted: true,
    }).select('name ownerName phone address city state pincode openTime closeTime workingDays latitude longitude');

    const mapped = pharmacies.map((pharmacy) => {
      let computedDistance: number | null = null;
      if (
        patientHasCoords &&
        typeof pharmacy.latitude === 'number' &&
        typeof pharmacy.longitude === 'number'
      ) {
        computedDistance = distanceKm(
          patient!.latitude as number,
          patient!.longitude as number,
          pharmacy.latitude,
          pharmacy.longitude
        );
      }

      return {
        id: pharmacy._id,
        name: pharmacy.name,
        ownerName: pharmacy.ownerName,
        phone: pharmacy.phone || '',
        address: pharmacy.address || '',
        city: pharmacy.city || '',
        state: pharmacy.state || '',
        pincode: pharmacy.pincode || '',
        openTime: pharmacy.openTime || '',
        closeTime: pharmacy.closeTime || '',
        workingDays: pharmacy.workingDays || [],
        distanceKm: computedDistance !== null ? parseFloat(computedDistance.toFixed(1)) : null,
      };
    });

    const nearby = mapped
      .filter((item) => item.distanceKm !== null && (item.distanceKm as number) <= maxDistanceKm)
      .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));

    res.status(200).json({
      success: true,
      data: nearby,
      patientHasLocation: Boolean(patientHasCoords),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby pharmacies',
      error: error.message,
    });
  }
});

router.post('/appointments/request', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({ success: false, message: 'Only patients can request appointments' });
      return;
    }

    const { doctorId, scheduledAt, notes } = req.body;

    if (!doctorId || !scheduledAt) {
      res.status(400).json({
        success: false,
        message: 'doctorId and scheduledAt are required',
      });
      return;
    }

    const slotDate = new Date(scheduledAt);
    if (isNaN(slotDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid appointment date/time' });
      return;
    }

    // Appointment time constraint removed - allow any time
    // if (!isWithinBookingHours(slotDate)) {
    //   res.status(400).json({
    //     success: false,
    //     message: 'Appointments can only be requested between 9:00 AM and 5:00 PM',
    //   });
    //   return;
    // }

    if (slotDate <= new Date()) {
      res.status(400).json({
        success: false,
        message: 'Please choose a future slot',
      });
      return;
    }

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor', isActive: true });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    slotDate.setSeconds(0, 0);

    const existingSlot = await Appointment.findOne({
      doctorId,
      scheduledAt: slotDate,
      status: { $in: ['pending', 'scheduled'] },
    });

    if (existingSlot) {
      res.status(409).json({
        success: false,
        message: 'This slot is already booked/requested for the selected doctor',
      });
      return;
    }

    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId,
      scheduledAt: slotDate,
      status: 'pending',
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment request sent to doctor',
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating appointment request',
      error: error.message,
    });
  }
});

router.get('/appointments/my', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({ success: false, message: 'Only patients can access appointments' });
      return;
    }

    const appointments = await Appointment.find({ patientId: req.user._id })
      .sort({ scheduledAt: 1 })
      .populate('doctorId', 'firstName lastName specialization');

    res.status(200).json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message,
    });
  }
});

router.get('/ratings/eligible', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({ success: false, message: 'Only patients can access this route' });
      return;
    }

    const now = new Date();

    const appointments = await Appointment.find({
      patientId: req.user._id,
      status: { $in: ['completed', 'scheduled'] },
      scheduledAt: { $lte: now },
    })
      .sort({ scheduledAt: -1 })
      .populate('doctorId', 'firstName lastName specialization')
      .lean();

    const appointmentIds = appointments.map((a: any) => a._id);

    const existingRatings = await DoctorRating.find({
      appointmentId: { $in: appointmentIds },
    }).select('appointmentId rating review');

    const ratingMap = new Map(
      existingRatings.map((rating) => [rating.appointmentId.toString(), rating])
    );

    const eligible = appointments.map((appointment: any) => {
      const doctor = appointment.doctorId;
      const existing = ratingMap.get(appointment._id.toString());

      return {
        appointmentId: appointment._id,
        doctorId: doctor?._id,
        doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Doctor',
        specialization: doctor?.specialization || 'General Physician',
        appointmentDate: appointment.scheduledAt,
        alreadyRated: Boolean(existing),
        existingRating: existing?.rating || null,
        existingReview: existing?.review || '',
      };
    });

    res.status(200).json({ success: true, data: eligible });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching eligible doctor ratings',
      error: error.message,
    });
  }
});

router.post('/ratings', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'patient') {
      res.status(403).json({ success: false, message: 'Only patients can rate doctors' });
      return;
    }

    const { appointmentId, doctorId, rating, review } = req.body;

    if (!appointmentId || !doctorId || typeof rating !== 'number') {
      res.status(400).json({
        success: false,
        message: 'appointmentId, doctorId and numeric rating are required',
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
      return;
    }

    const now = new Date();
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: req.user._id,
      doctorId,
      status: { $in: ['completed', 'scheduled'] },
      scheduledAt: { $lte: now },
    });

    if (!appointment) {
      res.status(403).json({
        success: false,
        message: 'You can only rate doctors you had appointments with',
      });
      return;
    }

    await DoctorRating.findOneAndUpdate(
      { appointmentId },
      {
        patientId: req.user._id,
        doctorId,
        appointmentId,
        rating,
        review,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const aggregate = await DoctorRating.aggregate([
      { $match: { doctorId: appointment.doctorId } },
      {
        $group: {
          _id: '$doctorId',
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avg = aggregate[0]?.avg || 0;
    const count = aggregate[0]?.count || 0;

    await User.findByIdAndUpdate(appointment.doctorId, {
      averageRating: parseFloat(avg.toFixed(1)),
      totalRatings: count,
    });

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        averageRating: parseFloat(avg.toFixed(1)),
        totalRatings: count,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error submitting doctor rating',
      error: error.message,
    });
  }
});

export default router;