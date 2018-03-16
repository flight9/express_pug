var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
var rbac = require('./rbac/index');

var UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    unique: true,
    required: true,
    trim: true
  }
}, {timestamps: true});

// Virtual for user's URL
UserSchema
.virtual('url')
.get(function () {
  return '/users/' + this._id;
});

// Hashing a password before saving it to the database
UserSchema.pre('save', function (next) {
  var user = this;
  if (user.isNew || user.isModified('password')) {
    bcrypt.hash(user.password, 10, function (err, hash){
      if (err) { return next(err); }
      user.password = hash;
      next();
    })
  }
  else {
    next();
  }
});

// Setup rbac
var grants = {
  'employee': {
    'book': ['create','read','search'],
    'author': ['read'],
    'genre': ['read'],
    'bookInstance': ['create','read'],
  },
  'manager': {
    'book': ['create','read','update','search'],
    'author': ['create','read','update'],
    'genre': ['create','read','update'],
    'bookInstance': ['create','read','update'],
    'user': ['read']
  },
  'admin': {
    'book': ['create','read','update','delete','search'],
    'author': ['create','read','update','delete'],
    'genre': ['create','read','update','delete'],
    'bookInstance': ['create','read','update','delete'],
    'user': ['read','update','delete']
  },
  'superAdmin': {}
};

function surpassGrants(user, op, res, resId) {
  if (user.hasRole('superAdmin')) {
    return true;
  } 
  else if( res == 'user' && (op=='update'||op=='read')) {
    return (user._id.toString() == resId);
  }
  
  return false;
}

rbac.init({
  grants: grants,
  callback: surpassGrants,
  schema: UserSchema
});

//Export model
module.exports = mongoose.model('User', UserSchema);

