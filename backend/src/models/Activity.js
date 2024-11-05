import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['ON-DUTY', 'MEETINGS', 'COMMUNITY ACTION', 'TRAIL ACTION', 'ORGANIZATION/CONDUCT OF TRIPS', 'TRIPS', 'MISCELLANEOUS'], 
    required: true 
  },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  location: { type: String },
  hoursSpent: { type: Number, required: true },
  members: [{ 
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    hoursContributed: { type: Number, default: 0 }
  }],
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  status: { 
    type: String, 
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], 
    default: 'PLANNED' 
  },
  maxParticipants: { type: Number },
  equipmentNeeded: [{ type: String }],
  notes: { type: String }
}, { timestamps: true });

// Virtual for number of participants
activitySchema.virtual('participantCount').get(function() {
  return this.members.length;
});

// Method to add a member to the activity
activitySchema.methods.addMember = function(memberId, hoursContributed) {
  if (!this.members.some(m => m.member.equals(memberId))) {
    this.members.push({ member: memberId, hoursContributed });
  }
};

// Method to remove a member from the activity
activitySchema.methods.removeMember = function(memberId) {
  this.members = this.members.filter(m => !m.member.equals(memberId));
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;