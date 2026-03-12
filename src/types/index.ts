// Types for the application
// Shared types between frontend and backend

export interface User {
  id: string;
  email: string;
  role: 'patient' | 'doctor';
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  address?: string;
  conditions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialization?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  patientId: string;
  reportType: string;
  reportDate?: Date;
  filePath?: string;
  fileSize?: number;
  ocrData?: Record<string, any>;
  processed: boolean;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  patientId: string;
  role: 'user' | 'assistant';
  content: string;
  isUnsure: boolean;
  reviewedByDoctor: boolean;
  createdAt: Date;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate?: Date;
  endDate?: Date;
  prescribedBy?: string;
  createdAt: Date;
}

// Dashboard types
export interface PatientDashboard {
  profile: Patient;
  stats: {
    upcomingAppointments: number;
    activeMedications: number;
    hasNewReport: boolean;
  };
  nextAppointment: Appointment | null;
  latestReport: Report | null;
}

export interface DoctorDashboard {
  profile: Doctor;
  stats: {
    patientsToday: number;
    pendingReviews: number;
  };
  nextPatient: {
    name: string;
    appointmentDate: Date;
    conditions: string[];
  } | null;
}

// Queue types
export interface QueueItem {
  appointmentId: string;
  appointmentDate: Date;
  status: string;
  notes?: string;
  patientId: string;
  patientName: string;
  age?: number;
  gender?: string;
  conditions: string[];
  unsureQueries: number;
}
