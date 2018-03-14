var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  }
});

// Virtual for user's URL
UserSchema
.virtual('url')
.get(function () {
  return '/user/' + this._id;
});

//hashing a password before saving it to the database
UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, 10, function (err, hash){
    if (err) { return next(err); }
    user.password = hash;
    next();
  })
});


//Export model
module.exports = mongoose.model('User', UserSchema);
