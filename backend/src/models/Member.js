import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  dateOfBirth: { type: Date },
  address: { type: String },
  joinDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  totalHours: { type: Number, default: 0 },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
  annualStatistics: [{
    year: { type: Number },
    hoursSpent: { type: Number, default: 0 },
    activitiesParticipated: { type: Number, default: 0 }
  }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Virtual for member's full name
memberSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`;
});

// Virtual for member's status (active/passive)
memberSchema.virtual('status').get(function() {
  const currentYear = new Date().getFullYear();
  const lastYearStats = this.annualStatistics.find(stat => stat.year === currentYear - 1);
  const currentYearStats = this.annualStatistics.find(stat => stat.year === currentYear);
  
  const totalHours = (lastYearStats ? lastYearStats.hoursSpent : 0) + 
                     (currentYearStats ? currentYearStats.hoursSpent : 0);
  
  return totalHours >= 20 ? 'Active' : 'Passive';
});

const Member = mongoose.model('Member', memberSchema);

export default Member;