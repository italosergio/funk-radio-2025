import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String },
  locale: { type: String },
  verified_email: { type: Boolean },
  given_name: { type: String },
  family_name: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false }
})

export default mongoose.model('User', userSchema)