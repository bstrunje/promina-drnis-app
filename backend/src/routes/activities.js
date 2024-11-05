import express from 'express';
import Activity from '../models/Activity.js';

const router = express.Router();

// Get all activities
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.find().populate('members.member', 'name surname').populate('organizer', 'name surname').select('-__v');
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activities', error: err.message });
  }
});

// Get an activity by ID
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('members.member', 'name surname')
      .populate('organizer', 'name surname')
      .select('-__v');
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching activity', error: err.message });
  }
});

// Create a new activity
router.post('/', async (req, res) => {
  try {
    const { type, title, date, description, location, hoursSpent, organizer, maxParticipants, equipmentNeeded } = req.body;

    if (!type || !title || !date || !description || !hoursSpent || !organizer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newActivity = new Activity({
      type,
      title,
      date,
      description,
      location,
      hoursSpent,
      organizer,
      maxParticipants,
      equipmentNeeded
    });

    const activity = await newActivity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Error creating activity', error: err.message });
  }
});

// Update an activity
router.put('/:id', async (req, res) => {
  try {
    const { type, title, date, description, location, hoursSpent, organizer, status, maxParticipants, equipmentNeeded } = req.body;

    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { type, title, date, description, location, hoursSpent, organizer, status, maxParticipants, equipmentNeeded },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Error updating activity', error: err.message });
  }
});

// Delete an activity
router.delete('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting activity', error: err.message });
  }
});

// Add a member to an activity
router.post('/:id/members', async (req, res) => {
  try {
    const { memberId, hoursContributed } = req.body;
    const activity = await Activity.findById(req.params.id);

    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    activity.addMember(memberId, hoursContributed);
    await activity.save();

    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Error adding member to activity', error: err.message });
  }
});

// Remove a member from an activity
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    activity.removeMember(req.params.memberId);
    await activity.save();

    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Error removing member from activity', error: err.message });
  }
});

export default router;