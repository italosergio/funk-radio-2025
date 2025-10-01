import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from './models/User.js'

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id })
    
    if (user) {
      user.lastLogin = new Date()
      user.isOnline = true
      await user.save()
      return done(null, user)
    }
    
    user = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0].value,
      locale: profile._json.locale,
      verified_email: profile._json.verified_email,
      given_name: profile._json.given_name,
      family_name: profile._json.family_name,
      isOnline: true
    })
    
    await user.save()
    done(null, user)
  } catch (error) {
    done(error, null)
  }
}))

passport.serializeUser((user, done) => {
  done(null, user._id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport