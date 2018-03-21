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
  },
  avatar: {
    type: String,
    trim: true
  },
  groups: [{
    type: Schema.ObjectId, 
    ref: 'Group'
  }]
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
  //NOTE 'read' = list(without _id) + see detail(with _id)
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
    /* For user: here read = read others */
    'user': ['read']
  },
  /* below roles are inside */
  'admin': {
    'book': ['create','read','update','delete','search'],
    'author': ['create','read','update','delete'],
    'genre': ['create','read','update','delete'],
    'bookInstance': ['create','read','update','delete'],
    'user': ['read','update'],
    'group': ['read','update']
  },
  'superAdmin': {}
};

var operates = ['create','read','update','delete','search','updaterole'];
var groupResources = ['device'];

// What info should give to Can()
function whatInfoToCan(res, ope, id) {
  var User = mongoose.model('User');
  var what = {
    group: false,
    target: false,
    req: true,
    id: true,
  };
  
  if (User.isGroupResource(res)) {
    what.group = true;
    if(id) {
      what.target = true;
    }
  }
  else if( ope == 'updaterole' && id) {
    what.target = true;
  }
  
  return what;
}

// Dynamic logic after grants
function dynamicGrants(user, ope, res, info) {
  if (user.hasRole('superAdmin')) {
    // Role superAdmin has absolute all permissions
    return true;
  } 
  else if( res == 'user') {
    if( ope=='update'||ope=='read') {
      // User can ONLY see and update himself by default
      var tar_id = info.id? info.id: '';
      return (user._id.toString() == tar_id);
    }
    else if( user.hasRole('admin') && ope=='updaterole' ) {
      //ONLY > admin can updaterole
      var User = mongoose.model('User');
      var tar = (info.target instanceof User)? info.target: null;
      var req = info.req;
      
      if( tar && !tar.hasRole('superAdmin')) {
        // Role admin can ONLY update the role of non-superAdmin user
        if (req) {
          if (req.method=='GET') {
            return true;
          }
          else if (req.method=='POST' && req.body.roles.indexOf('superAdmin')==-1) {
            // Role admin can ONLY assign non-superAdmin role to a user
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

rbac.init({
  grants,
  callback: dynamicGrants,
  operates,
  groupResources,
  whatInfoToCan,
  schema: UserSchema
});

//Export model
module.exports = mongoose.model('User', UserSchema);

