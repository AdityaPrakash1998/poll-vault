const mongoose=require('mongoose');
const Schema=mongoose.Schema;

//PollSchema
const PollSchema= new Schema({
  name:String,
  creatorFirstName:String,
  creatorLastName:String,
  creatorEmail:String,
  labels:[String],
  descriptions:[String],
  votes:[Number],
  created: { type: Date, default: Date.now }
});
//Create collection
const Poll=mongoose.model('Poll',PollSchema);

module.exports=Poll;
