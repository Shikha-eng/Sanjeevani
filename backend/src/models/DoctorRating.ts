import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctorRating extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

const doctorRatingSchema = new Schema<IDoctorRating>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 600,
    },
  },
  {
    timestamps: true,
  }
);

doctorRatingSchema.index({ patientId: 1, doctorId: 1, appointmentId: 1 }, { unique: true });

const DoctorRating = mongoose.model<IDoctorRating>('DoctorRating', doctorRatingSchema);

export default DoctorRating;