// Example Frontend Integration
// This shows how to use the backend API in your Next.js frontend pages

'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useLowData } from '@/context/LowDataContext';
import type { PatientDashboard } from '@/types';

export default function OptimizedDashboard() {
  const [dashboard, setDashboard] = useState<PatientDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const { isLowDataMode } = useLowData();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      
      // In low data mode, request only essential fields
      const fields = isLowDataMode
        ? ['profile.name', 'stats', 'nextAppointment']
        : undefined;
      
      const data = await apiClient.get<PatientDashboard>(
        '/patient/dashboard',
        fields,
        true // Use cache
      );
      
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  // Example: Book appointment
  async function bookAppointment(doctorId: string, date: string) {
    try {
      await apiClient.post('/appointments', {
        doctorId,
        appointmentDate: date,
        notes: 'Follow-up appointment',
      });
      
      // Refresh dashboard
      await loadDashboard();
    } catch (error) {
      console.error('Failed to book appointment:', error);
    }
  }

  // Example: Send AI message
  async function sendMessage(message: string) {
    try {
      const response = await apiClient.post('/assistant', { message });
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!dashboard) return <div>Error loading dashboard</div>;

  return (
    <div>
      <h1>Welcome, {dashboard.profile.name}</h1>
      
      {/* Stats */}
      <div className="stats">
        <div>Appointments: {dashboard.stats.upcomingAppointments}</div>
        <div>Medications: {dashboard.stats.activeMedications}</div>
      </div>

      {/* Next Appointment */}
      {dashboard.nextAppointment && (
        <div className="next-appointment">
          <h2>Next Appointment</h2>
          <p>{new Date(dashboard.nextAppointment.appointmentDate).toLocaleString()}</p>
        </div>
      )}

      {/* In low data mode, show less detail */}
      {!isLowDataMode && dashboard.latestReport && (
        <div className="latest-report">
          <h2>Latest Report</h2>
          <p>{dashboard.latestReport.reportType}</p>
        </div>
      )}
    </div>
  );
}
