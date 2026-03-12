// API Quick Reference
// Copy-paste examples for common operations

import { apiClient } from '@/lib/apiClient';

// ============================================
// AUTHENTICATION
// ============================================

// Sign up
const signup = async () => {
  const user = await apiClient.post('/auth/signup', {
    email: 'user@example.com',
    password: 'password123',
    role: 'patient', // or 'doctor'
    name: 'John Doe',
  });
};

// Login
const login = async () => {
  const user = await apiClient.post('/auth/login', {
    email: 'user@example.com',
    password: 'password123',
    role: 'patient', // or 'doctor'
  });
};

// ============================================
// PATIENT - DASHBOARD
// ============================================

// Get full dashboard
const getDashboard = async () => {
  const dashboard = await apiClient.get('/patient/dashboard');
  // Returns: profile, stats, nextAppointment, latestReport
};

// Get dashboard with field selection (low data mode)
const getDashboardMinimal = async () => {
  const dashboard = await apiClient.get(
    '/patient/dashboard',
    ['profile.name', 'stats']
  );
  // Returns only specified fields - saves bandwidth!
};

// ============================================
// PROFILE
// ============================================

// Get profile
const getProfile = async () => {
  const profile = await apiClient.get('/profile');
};

// Get profile with specific fields
const getProfileMinimal = async () => {
  const profile = await apiClient.get('/profile', ['id', 'name', 'age']);
};

// Update profile
const updateProfile = async () => {
  const updated = await apiClient.patch('/profile', {
    name: 'Updated Name',
    age: 30,
    phone: '+1234567890',
  });
};

// ============================================
// APPOINTMENTS
// ============================================

// Get appointments (paginated)
const getAppointments = async (page = 1, limit = 10) => {
  const appointments = await apiClient.get(
    `/appointments?page=${page}&limit=${limit}`
  );
};

// Book appointment
const bookAppointment = async () => {
  const appointment = await apiClient.post('/appointments', {
    doctorId: 'doctor-uuid-here',
    appointmentDate: '2026-03-15T10:00:00Z',
    notes: 'Follow-up consultation',
  });
};

// ============================================
// AI ASSISTANT
// ============================================

// Get chat history
const getChatHistory = async (limit = 50) => {
  const messages = await apiClient.get(`/assistant?limit=${limit}`);
};

// Send message
const sendMessage = async (message: string) => {
  const response = await apiClient.post('/assistant', {
    message: message,
  });
  // Returns: { message: { id, role, content, isUnsure, createdAt } }
};

// ============================================
// REPORTS
// ============================================

// Get reports list (metadata only)
const getReports = async (page = 1) => {
  const reports = await apiClient.get(`/reports?page=${page}&limit=20`);
  // Returns list with metadata, not file data
};

// Upload report metadata
const uploadReport = async () => {
  const report = await apiClient.post('/reports', {
    reportType: 'Blood Test',
    reportDate: '2026-03-10',
    fileSize: 2048576,
    ocrData: {
      /* extracted data */
    },
  });
};

// ============================================
// MEDICATIONS
// ============================================

// Get all medications
const getAllMedications = async () => {
  const medications = await apiClient.get('/medications');
};

// Get active medications only
const getActiveMedications = async () => {
  const medications = await apiClient.get('/medications?active=true');
};

// Add medication
const addMedication = async () => {
  const medication = await apiClient.post('/medications', {
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    startDate: '2026-03-01',
  });
};

// ============================================
// DOCTOR - DASHBOARD
// ============================================

// Get doctor dashboard
const getDoctorDashboard = async () => {
  const dashboard = await apiClient.get('/doctor/dashboard');
  // Returns: profile, stats, nextPatient
};

// ============================================
// DOCTOR - QUEUE
// ============================================

// Get today's patient queue
const getQueue = async () => {
  const queue = await apiClient.get('/doctor/queue');
  // Returns list of today's scheduled appointments
};

// ============================================
// LOW DATA MODE EXAMPLE
// ============================================

const SmartDataFetch = ({ isLowDataMode }: { isLowDataMode: boolean }) => {
  const loadData = async () => {
    if (isLowDataMode) {
      // Minimal fields for low bandwidth
      const data = await apiClient.get('/patient/dashboard', [
        'profile.name',
        'stats.upcomingAppointments',
      ]);
      // Response: ~150 bytes
    } else {
      // Full data for good connection
      const data = await apiClient.get('/patient/dashboard');
      // Response: ~500 bytes
    }
  };
};

// ============================================
// ERROR HANDLING
// ============================================

const handleApiCall = async () => {
  try {
    const data = await apiClient.get('/patient/dashboard');
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('API Error:', error.message);
      // Handle specific errors
      if (error.message.includes('Unauthorized')) {
        // Redirect to login
      }
    }
  }
};

// ============================================
// CACHE MANAGEMENT
// ============================================

// Clear client-side cache (e.g., after logout)
const logout = () => {
  apiClient.clearCache();
  // Then redirect to login
};

// Force fresh data (bypass cache)
const refreshData = async () => {
  const data = await apiClient.request('/patient/dashboard', {
    useCache: false,
  });
};

// ============================================
// RESPONSE FORMAT
// ============================================

// All successful responses:
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

// All error responses:
interface ApiError {
  success: false;
  error: string;
}

export {
  signup,
  login,
  getDashboard,
  getProfile,
  updateProfile,
  getAppointments,
  bookAppointment,
  sendMessage,
  getReports,
  uploadReport,
  getAllMedications,
  getActiveMedications,
  addMedication,
};
