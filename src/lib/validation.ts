// Request Validation using Zod
// Type-safe validation for API requests

import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['patient', 'doctor']),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['patient', 'doctor']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

// Appointment schemas
export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  appointmentDate: z.string().datetime('Invalid date format'),
  notes: z.string().optional(),
});

// Profile update schemas
export const updatePatientProfileSchema = z.object({
  name: z.string().min(2).optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  conditions: z.array(z.string()).optional(),
});

export const updateDoctorProfileSchema = z.object({
  name: z.string().min(2).optional(),
  specialization: z.string().optional(),
  phone: z.string().optional(),
});

// Report schemas
export const createReportSchema = z.object({
  reportType: z.string().min(1, 'Report type is required'),
  reportDate: z.string().date().optional(),
  fileSize: z.number().int().positive().optional(),
  ocrData: z.record(z.any()).optional(),
});

// Medication schemas
export const createMedicationSchema = z.object({
  patientId: z.string().uuid().optional(),
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

// AI Assistant schemas
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}
