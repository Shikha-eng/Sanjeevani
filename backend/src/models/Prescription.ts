import mongoose, { Document, Schema } from 'mongoose';

export interface IPrescription extends Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  pharmacyId: mongoose.Types.ObjectId;
  medications: string;
  instructions?: string;
  status: 'sent' | 'dispensed';
  sentAt: Date;
  dispensedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pharmacyId: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    medications: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['sent', 'dispensed'],
      default: 'sent',
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    dispensedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
