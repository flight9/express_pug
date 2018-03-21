var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GroupSchema = new Schema({
  code: {type: String, required: true, unique: true},
  name: {type: String, required: true},
  parent: {type: Schema.ObjectId, ref: 'Group'},
  incharge: {type: Schema.ObjectId, ref: 'User'},
  brand: {type: String, required: true},
  type: {type: String, required: true, enum: ['hq', 'facility', 'tenant', 'private', 'msp'], default: 'private'},
});

// Virtual for URL
GroupSchema
.virtual('url')
.get(function () {
  return '/gp/' + this.code;
});

//Export model
module.exports = mongoose.model('Group', GroupSchema);
