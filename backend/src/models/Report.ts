import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  patientId: mongoose.Types.ObjectId;
  reportName: string;
  reportType: string;
  uploadDate: Date;
  imageUrl: string;
  ocrText: string;
  summary: string;
  keyFindings: string[];
  parameters?: {
    name: string;
    value: string;
    unit?: string;
    normalRange?: string;
    status?: 'normal' | 'high' | 'low';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportName: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
    },
    reportType: {
      type: String,
      required: true,
      enum: ['Blood Test', 'Urine Test', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG', 'Other'],
      default: 'Other',
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    ocrText: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    keyFindings: [{
      type: String,
    }],
    parameters: [{
      name: {
        type: String,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
      unit: {
        type: String,
      },
      normalRange: {
        type: String,
      },
      status: {
        type: String,
        enum: ['normal', 'high', 'low'],
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
reportSchema.index({ patientId: 1, uploadDate: -1 });

const Report = mongoose.model<IReport>('Report', reportSchema);

export default Report;
