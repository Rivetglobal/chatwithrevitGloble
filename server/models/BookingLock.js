const mongoose = require('mongoose');

// Lightweight distributed lock document. Each lock is identified by a
// string key (e.g. "projectId|date|time|location"). TTL index removes
// documents automatically after `expiresAt` so stale locks never block
// indefinitely — even if the holder process crashed mid-flight.
const bookingLockSchema = new mongoose.Schema(
  {
    _id: { type: String },
    expiresAt: { type: Date, required: true },
  },
  {
    _id: false,
    versionKey: false,
    collection: 'bookinglocks',
  }
);

// MongoDB TTL index: remove document once expiresAt has passed (0 = immediately).
bookingLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BookingLock', bookingLockSchema);
