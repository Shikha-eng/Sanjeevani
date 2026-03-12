import mongoose, { Document, Schema } from 'mongoose';

export interface IAiQuestion extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  question: string;
  aiResponse: string;
  doctorReply?: string;
  doctorReplyAt?: Date;
  specialization?: string;
  isComplex: boolean;
  reviewedByDoctor: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const aiQuestionSchema = new Schema<IAiQuestion>(
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
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    aiResponse: {
      type: String,
      required: true,
      trim: true,
    },
    doctorReply: {
      type: String,
      trim: true,
      default: '',
    },
    doctorReplyAt: {
      type: Date,
    },
    specialization: {
      type: String,
      trim: true,
      index: true,
    },
    isComplex: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewedByDoctor: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const AiQuestion = mongoose.model<IAiQuestion>('AiQuestion', aiQuestionSchema);

export default AiQuestion;