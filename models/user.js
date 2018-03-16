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
  //NOTE user 'create' is designed as 'signup' and assigned to everyone(without listing)
  //NOTE 'read' = list(with out _id) + see detail(with _id)
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
    /* here read = read others */
    'user': ['read']
  },
  'admin': {
    'book': ['create','read','update','delete','search'],
    'author': ['create','read','update','delete'],
    'genre': ['create','read','update','delete'],
    'bookInstance': ['create','read','update','delete'],
    'user': ['read','update']
  },
  'superAdmin': {}
};

function surpassGrants(user, ope, res, resInfo) {
  if (user.hasRole('superAdmin')) {
    // superAdmin has absolute all permissions
    return true;
  } 
  else if( res == 'user') {
    if( ope=='update'||ope=='read') {
      // user can only see and update himself by default
      var tar_id = resInfo? resInfo: '';
      return (user._id.toString() == tar_id);
    }
    else if( user.hasRole('admin') && ope=='updaterole' ) {
      // admin can't update the role of superAdmin user
      var User = mongoose.model('User');
      var tar_user = (resInfo instanceof User)? resInfo: null;
      if( tar_user) {
        return !tar_user.hasRole('superAdmin');
      }
    }
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

