import mongoose from 'mongoose';

const CardAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    originalImage: {
      key: String,
      fileName: String,
      contentType: String,
      public: String,
      link: String,
    },
    extractedData: {
      name: {
        type: String,
        default: '',
      },
      phoneNumber: {
        type: String,
        default: '',
      },
      email: {
        type: String,
        default: '',
      },
      address: {
        type: String,
        default: '',
      },
      website: {
        type: String,
        default: '',
      },
      business: {
        type: String,
        default: '',
      },
    },
    rawOcrText: {
      type: String,
      required: [true, 'Raw OCR text is required'],
    },
    confidence: {
      type: Number,
      default: 0,
    },
    processingTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'completed',
    },
    saved: {
      type: Boolean,
      default: false,
    },
    savedToProfile: {
      type: mongoose.Schema.ObjectId,
      ref: 'Profile',
    },
  },
  { 
    timestamps: true 
  }
);

// Index for efficient queries
CardAnalysisSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('CardAnalysis', CardAnalysisSchema); 