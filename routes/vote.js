const nodemailer=require('nodemailer');
const route=require('express').Router();
const mongoose=require('mongoose');

require('../config/db.js');
const Poll=require('../models/poll.js');

function updateVote(id,newVote,res){
  Poll.findByIdAndUpdate(id,{votes: newVote}, {new:true}, (err,poll)=>{
    if(err) console.log(err);
    else{
      res.redirect(`/poll/findandshow/${id}`);
    }
  });
}

route.post('/add_vote',(req,res)=>{
  var newVotes=[];
  Poll.findById(req.body.id, (err,poll)=>{
    newVotes=poll.votes;
    var labels=poll.labels;
    newVotes[labels.indexOf(req.body.vote_to)]++;
    updateVote(req.body.id,newVotes,res);
  });
});

module.exports=route;
