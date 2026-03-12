import { Router, Response } from 'express';
import { protect } from '../middleware/auth';
import Appointment from '../models/Appointment';
import AiQuestion from '../models/AiQuestion';
import Report from '../models/Report';
import User from '../models/User';
import Pharmacy from '../models/Pharmacy';
import Prescription from '../models/Prescription';

const router = Router();

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

router.post('/appointments/:appointmentId/complete-with-prescription', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({ success: false, message: 'Only doctors can complete appointments' });
      return;
    }

    const { appointmentId } = req.params;
    const { medications, instructions } = req.body;

    if (!medications || !String(medications).trim()) {
      res.status(400).json({ success: false, message: 'Medications / prescription text is required' });
      return;
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: req.user._id,
      status: 'scheduled',
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Scheduled appointment not found' });
      return;
    }

    const existingPrescription = await Prescription.findOne({ appointmentId: appointment._id });
    if (existingPrescription) {
      res.status(409).json({ success: false, message: 'Prescription already created for this appointment' });
      return;
    }

    const patient = await User.findById(appointment.patientId).select('address city state latitude longitude');
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    const pharmacies = await Pharmacy.find({
      isActive: true,
      onboardingCompleted: true,
    }).select('name address city state latitude longitude');

    if (!pharmacies.length) {
      res.status(404).json({ success: false, message: 'No active pharmacy available' });
      return;
    }

    let nearestPharmacy: any = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    const patientHasCoords = typeof patient.latitude === 'number' && typeof patient.longitude === 'number';

    if (patientHasCoords) {
      for (const pharmacy of pharmacies) {
        if (typeof pharmacy.latitude !== 'number' || typeof pharmacy.longitude !== 'number') continue;
        const dist = distanceKm(patient.latitude as number, patient.longitude as number, pharmacy.latitude, pharmacy.longitude);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestPharmacy = pharmacy;
        }
      }
    }

    if (!nearestPharmacy) {
      const patientCity = (patient.city || '').trim().toLowerCase();
      const sameCity = pharmacies.filter((ph) => (ph.city || '').trim().toLowerCase() === patientCity);
      nearestPharmacy = sameCity[0] || pharmacies[0];
      nearestDistance = Number.NaN;
    }

    const prescription = await Prescription.create({
      appointmentId: appointment._id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      pharmacyId: nearestPharmacy._id,
      medications: String(medications).trim(),
      instructions: instructions ? String(instructions).trim() : '',
      status: 'sent',
      sentAt: new Date(),
    });

    appointment.status = 'completed';
    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Appointment completed and prescription sent to nearest pharmacy',
      data: {
        prescriptionId: prescription._id,
        appointmentId: appointment._id,
        pharmacy: {
          id: nearestPharmacy._id,
          name: nearestPharmacy.name,
          address: nearestPharmacy.address || '',
          city: nearestPharmacy.city || '',
          state: nearestPharmacy.state || '',
          distanceKm: Number.isNaN(nearestDistance) ? null : parseFloat(nearestDistance.toFixed(1)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error completing appointment with prescription',
      error: error.message,
    });
  }
});

router.get('/ai-questions/pending', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({ success: false, message: 'Only doctors can access AI questions' });
      return;
    }

    const questions = await AiQuestion.find({
      doctorId: req.user._id,
      isComplex: true,
      reviewedByDoctor: false,
    })
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName');

    res.status(200).json({ success: true, data: questions });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending AI questions',
      error: error.message,
    });
  }
});

router.put('/ai-questions/:questionId/reply', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({ success: false, message: 'Only doctors can reply to AI questions' });
      return;
    }

    const { questionId } = req.params;
    const { doctorReply } = req.body;

    if (!doctorReply || !doctorReply.trim()) {
      res.status(400).json({ success: false, message: 'Doctor reply is required' });
      return;
    }

    const question = await AiQuestion.findOneAndUpdate(
      {
        _id: questionId,
        doctorId: req.user._id,
        isComplex: true,
      },
      {
        doctorReply: doctorReply.trim(),
        doctorReplyAt: new Date(),
        reviewedByDoctor: true,
      },
      { new: true }
    ).populate('patientId', 'firstName lastName');

    if (!question) {
      res.status(404).json({ success: false, message: 'AI question not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reply sent to patient successfully',
      data: question,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error sending doctor reply',
      error: error.message,
    });
  }
});

router.get('/queue/today', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({
        success: false,
        message: 'Only doctors can access the queue',
      });
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const now = new Date();

    const appointments = await Appointment.find({
      doctorId: req.user._id,
      status: 'scheduled',
      scheduledAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .sort({ scheduledAt: 1 })
      .populate(
        'patientId',
        'firstName lastName dateOfBirth bloodGroup height weight hasDiabetes hasBloodPressure medicalHistory allergies'
      );

    const patientIds = appointments
      .map((appointment: any) => appointment.patientId?._id)
      .filter(Boolean);

    const [reports, pendingQuestions] = await Promise.all([
      Report.find({ patientId: { $in: patientIds } })
        .sort({ uploadDate: -1 })
        .select('patientId reportName reportType uploadDate summary keyFindings parameters imageUrl'),
      AiQuestion.find({
        patientId: { $in: patientIds },
        isComplex: true,
        reviewedByDoctor: false,
      }).select('patientId question aiResponse createdAt'),
    ]);

    const reportMap = new Map<string, any[]>();
    reports.forEach((report: any) => {
      const key = report.patientId.toString();
      const existing = reportMap.get(key) || [];
      existing.push(report);
      reportMap.set(key, existing);
    });

    const questionMap = new Map<string, any[]>();
    pendingQuestions.forEach((question: any) => {
      const key = question.patientId.toString();
      const existing = questionMap.get(key) || [];
      existing.push(question);
      questionMap.set(key, existing);
    });

    const queue = appointments.map((appointment: any, index) => {
      const patient = appointment.patientId;
      const patientReports = reportMap.get(patient._id.toString()) || [];
      const latestReport = patientReports[0] || null;
      const patientQuestions = questionMap.get(patient._id.toString()) || [];

      const conditions: string[] = [];
      if (patient.hasDiabetes) conditions.push('Diabetes');
      if (patient.hasBloodPressure) conditions.push('High Blood Pressure');

      let age: number | null = null;
      if (patient.dateOfBirth) {
        const dob = new Date(patient.dateOfBirth);
        age = now.getFullYear() - dob.getFullYear();
        const hasBirthdayPassed =
          now.getMonth() > dob.getMonth() ||
          (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
        if (!hasBirthdayPassed) age -= 1;
      }

      const status = appointment.scheduledAt <= now ? 'Waiting' : 'Upcoming';

      return {
        id: appointment._id,
        patient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          age,
          bloodGroup: patient.bloodGroup || null,
          height: patient.height || null,
          weight: patient.weight || null,
          conditions,
          allergies: patient.allergies || [],
          medicalHistory: patient.medicalHistory || '',
        },
        scheduledAt: appointment.scheduledAt,
        status,
        alerts: patientQuestions.length,
        latestReport: latestReport
          ? {
              reportName: latestReport.reportName,
              reportType: latestReport.reportType,
              uploadDate: latestReport.uploadDate,
              imageUrl: latestReport.imageUrl,
              summary: latestReport.summary,
              keyFindings: latestReport.keyFindings || [],
              parameters: latestReport.parameters || [],
            }
          : null,
        pendingQuestions: patientQuestions.map((question: any) => ({
          id: question._id,
          question: question.question,
          aiResponse: question.aiResponse,
          createdAt: question.createdAt,
        })),
        queuePosition: index + 1,
      };
    });

    res.status(200).json({ success: true, data: queue });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching today queue',
      error: error.message,
    });
  }
});

router.get('/appointments/requests', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({
        success: false,
        message: 'Only doctors can access appointment requests',
      });
      return;
    }

    const requests = await Appointment.find({
      doctorId: req.user._id,
      status: 'pending',
    })
      .sort({ scheduledAt: 1 })
      .populate('patientId', 'firstName lastName');

    res.status(200).json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment requests',
      error: error.message,
    });
  }
});

router.put('/appointments/:appointmentId/accept', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({ success: false, message: 'Only doctors can accept requests' });
      return;
    }

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: req.user._id,
      status: 'pending',
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Pending appointment request not found' });
      return;
    }

    const slotConflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: req.user._id,
      scheduledAt: appointment.scheduledAt,
      status: 'scheduled',
    });

    if (slotConflict) {
      await Appointment.findByIdAndUpdate(appointment._id, { status: 'rejected' });
      res.status(409).json({
        success: false,
        message: 'Slot already booked. This request was automatically rejected.',
      });
      return;
    }

    appointment.status = 'scheduled';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment request accepted and scheduled',
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error accepting appointment request',
      error: error.message,
    });
  }
});

router.put('/appointments/:appointmentId/reject', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({ success: false, message: 'Only doctors can reject requests' });
      return;
    }

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        doctorId: req.user._id,
        status: 'pending',
      },
      { status: 'rejected' },
      { new: true }
    );

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Pending appointment request not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Appointment request rejected',
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting appointment request',
      error: error.message,
    });
  }
});

router.get('/appointments/scheduled', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({ success: false, message: 'Only doctors can access appointments' });
      return;
    }

    const appointments = await Appointment.find({
      doctorId: req.user._id,
      status: 'scheduled',
    })
      .sort({ scheduledAt: 1 })
      .populate('patientId', 'firstName lastName');

    res.status(200).json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduled appointments',
      error: error.message,
    });
  }
});

router.get('/dashboard/stats', protect, async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'doctor') {
      res.status(403).json({
        success: false,
        message: 'Only doctors can access dashboard stats',
      });
      return;
    }

    const doctorId = req.user._id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const now = new Date();

    const [todayMeetings, pendingAiReviews, doctor, nextAppointment] = await Promise.all([
      Appointment.countDocuments({
        doctorId,
        status: 'scheduled',
        scheduledAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }),
      AiQuestion.countDocuments({
        doctorId,
        isComplex: true,
        reviewedByDoctor: false,
      }),
      User.findById(doctorId).select('averageRating totalRatings'),
      Appointment.findOne({
        doctorId,
        status: 'scheduled',
        scheduledAt: { $gte: now },
      })
        .sort({ scheduledAt: 1 })
        .populate(
          'patientId',
          'firstName lastName bloodGroup height weight hasDiabetes hasBloodPressure medicalHistory allergies'
        ),
    ]);

    let nextPatient = null;

    if (nextAppointment && nextAppointment.patientId) {
      const patient: any = nextAppointment.patientId;
      const reports = await Report.find({ patientId: patient._id })
        .sort({ uploadDate: -1 })
        .limit(3)
        .select('reportName reportType uploadDate summary keyFindings parameters');

      const conditions: string[] = [];
      if (patient.hasDiabetes) conditions.push('Diabetes');
      if (patient.hasBloodPressure) conditions.push('High Blood Pressure');

      const bmi = patient.height && patient.weight
        ? parseFloat((patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1))
        : null;

      const summarizedReports = reports.map((report) => ({
        id: report._id,
        reportName: report.reportName,
        reportType: report.reportType,
        uploadDate: report.uploadDate,
        summary: report.summary,
        keyFindings: report.keyFindings || [],
        parameters: (report.parameters || []).slice(0, 5),
      }));

      nextPatient = {
        appointmentId: nextAppointment._id,
        scheduledAt: nextAppointment.scheduledAt,
        patient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          bloodGroup: patient.bloodGroup || null,
          height: patient.height || null,
          weight: patient.weight || null,
          bmi,
          conditions,
          allergies: patient.allergies || [],
          medicalHistory: patient.medicalHistory || '',
        },
        latestReports: summarizedReports,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        todayMeetings,
        pendingAiReviews,
        averageRating: doctor?.averageRating || 0,
        totalRatings: doctor?.totalRatings || 0,
        nextPatient,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor dashboard stats',
      error: error.message,
    });
  }
});

export default router;