const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// Get all staff
router.get('/', auth, async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get staff by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create staff
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, role, certifications, availability } = req.body;
    const user = await User.findById(req.userId);

    const staff = new Staff({
      name,
      email,
      phone,
      role,
      certifications: certifications || [],
      availability: availability || {},
      appointments: 0
    });

    await staff.save();

    await AuditLog.create({
      action: 'Create',
      entity: 'Staff',
      userId: req.userId,
      userName: user.name,
      userEmail: user.email,
      details: `Added staff member: ${name}`,
      status: 'Success'
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update staff
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, address, role, availability } = req.body;
    const user = await User.findById(req.userId);

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, address, role, availability },
      { new: true }
    );

    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });

    await AuditLog.create({
      action: 'Modify',
      entity: 'Staff',
      userId: req.userId,
      userName: user.name,
      userEmail: user.email,
      details: `Updated staff member: ${name}`,
      status: 'Success'
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete staff
router.delete('/:id', auth, async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    const user = await User.findById(req.userId);

    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });

    await AuditLog.create({
      action: 'Delete',
      entity: 'Staff',
      userId: req.userId,
      userName: user.name,
      userEmail: user.email,
      details: `Removed staff member: ${staff.name}`,
      status: 'Success'
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;