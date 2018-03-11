var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var AuthorSchema = new Schema(
  {
    first_name: {type: String, required: true, max: 100},
    family_name: {type: String, required: true, max: 100},
    date_of_birth: {type: Date},
    date_of_death: {
      type: Date,
      validate: [dateValidator, 'Birth Date must be less than Death Date']
    },
  }
);

// ZM: Validator for date_of_death
function dateValidator(value) {
  // `this` is the mongoose document
  console.log('dateValidator:', this.date_of_birth, value)
  if( this.date_of_birth && value) {
    return this.date_of_birth < value;
  }
  else {
    return this.date_of_birth? true: false; // Only Death Date is invalid.
  }
}

// Virtual for author's full name
AuthorSchema
	.virtual('name')
	.get(function () {
	  return this.family_name + ', ' + this.first_name;
	});

// Virtual for author's URL
AuthorSchema
	.virtual('url')
	.get(function () {
		return '/catalog/author/' + this._id;
	});

AuthorSchema
	.virtual('lifespan')
	.get(function() {
		return (this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD') : 'N/A') + ' - '+
			(this.date_of_death ? moment(this.date_of_death).format('YYYY-MM-DD') : 'N/A');
	});
  
AuthorSchema
.virtual('date_of_birth_formatted')
.get(function(){
  return this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD'): '';
});
  
AuthorSchema
.virtual('date_of_death_formatted')
.get(function(){
  return this.date_of_death ? moment(this.date_of_death).format('YYYY-MM-DD'): '';
});

//Export model
module.exports = mongoose.model('Author', AuthorSchema);

