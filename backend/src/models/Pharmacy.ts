import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPharmacy extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  ownerName: string;
  licenseNumber: string;

  // Location — filled during onboarding
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;

  // Operating hours
  openTime?: string;   // e.g. "08:00"
  closeTime?: string;  // e.g. "22:00"
  workingDays?: string[]; // ['Mon','Tue',...,'Sun']

  // Status
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const pharmacySchema = new Schema<IPharmacy>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    ownerName: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },

    // Location
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },

    // Hours
    openTime: { type: String, trim: true },
    closeTime: { type: String, trim: true },
    workingDays: [{ type: String }],

    isActive: { type: Boolean, default: true },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before save
pharmacySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

pharmacySchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidate, this.password);
  } catch {
    return false;
  }
};

const Pharmacy = mongoose.model<IPharmacy>('Pharmacy', pharmacySchema);
export default Pharmacy;
