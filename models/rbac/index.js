var rbac = {};

rbac.init = function (config) {
  rbac.config = config;
  rbac.attach(config.schema);
};

// attach to mongoose's UserSchema
rbac.attach = function (UserSchema) {
  var config = this.config;

  UserSchema.add({
    roles: {type:[ String ], default:[]},
  });

  UserSchema.methods.can = function (operate, resource, extraInfo) {
    console.log('Enter can():', operate, resource, this);
    var roles = this.roles,
      allows, _can;
    var _resCan = true, _opeCan = false;
      
    //ZM: check whether a protected group resource
    //ZM: (we consider 'group' as a common resource, so skip check _resCan) 
    var grs = config.groupResources;
    if(grs && grs.indexOf(resource)>-1) {
      var group = extraInfo.req? extraInfo.req.group: null;
      var req_gpid = group? group._id: null;
      var tar_gpid = extraInfo.target? extraInfo.target.group: null;
      var usr_gpids = this.groups? this.groups: [];
      
      // Must exit req group id and it should within user groups
      if(!req_gpid) {
        _resCan = false;
      }
      else if( usr_gpids.indexOf(req_gpid) == -1) {
        _resCan = false;
      }
      
      // If target group id exists, it should within user groups
      if(tar_gpid && usr_gpids.indexOf(tar_gpid) == -1) {
        _resCan = false;
      }
    }

    // check grants
    if(_resCan) {
      roles.forEach(function (role) {
        allows = config.grants[role][resource];
        if (allows && allows.indexOf(operate) > -1) {
          _opeCan = true;
        }
      });
    }

    // check customs callback func
    _can = _resCan && _opeCan;
    if (!_can) {
      _can = config.callback(this, operate, resource, extraInfo);
    }

    return _can;
  };
  
  UserSchema.methods.hasRole = function (role) {
    return this.roles.indexOf(role) > -1
  };
  
  UserSchema.statics.allRoles = function () {
    return 'grants' in config ? Object.keys(config.grants): [];
  };
  
  UserSchema.statics.allOperates = function () {
    return 'operates' in config ? config.operates: [];
  };
  
  UserSchema.statics.isGroupResource = function (res) {
    var groupResources = 'groupResources' in config ? config.groupResources: [];
    return groupResources.indexOf(res) > -1;
  };
  
  UserSchema.statics.whatInfoToCan = config.whatInfoToCan;
};

module.exports = rbac;