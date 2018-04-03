const nodemailer=require('nodemailer');
const route=require('express').Router();
const mongoose=require('mongoose');

require('../config/db.js');
const Poll=require('../models/poll.js');

//Updates vote in the database and redirects to poll_dashboard
function updateVote(id,newVote,res){
  Poll.findByIdAndUpdate(id,{votes: newVote}, {new:true}, (err,poll)=>{
    if(err) console.log(err);
    else{
      res.redirect(`/poll/findandshow/${id}`);
    }
  });
}

//Handles POST request for vote adding
route.post('/add_vote',(req,res)=>{
  //Adding new entry in the cookie
  if(req.cookies['Important']==undefined){
    var voted=[req.body.id];
    res.cookie('Important',JSON.stringify(voted),{ expires: new Date(Date.now() + 9999999), httpOnly: true });
  }else {
    var voted=JSON.parse(req.cookies['Important'])
    voted.push(req.body.id);
    res.clearCookie('Important');
    res.cookie('Important',JSON.stringify(voted),{ expires: new Date(Date.now() + 9999999), httpOnly: true });
  }

  var newVotes=[];
  Poll.findById(req.body.id, (err,poll)=>{
    newVotes=poll.votes;
    var labels=poll.labels;
    newVotes[labels.indexOf(req.body.vote_to)]++;
    updateVote(req.body.id,newVotes,res);
  });
});

//Handles form submission of Specific votes
route.post('/found',(req,res)=>{
  //Important is not set. User has not yet voted for any poll

  if(req.cookies['Important']==undefined){
    var id=req.body.id;
    Poll.findById(id,(err,poll)=>{
      if(err) console.log(err);
      else{
        res.render('vote',{
          name:poll.name,
          labels:poll.labels,
          descriptions:poll.descriptions,
          id:poll._id
        });
      }
    });
  }
  //User has voted for some polls on the site
  else {
    var voted=JSON.parse(req.cookies['Important']);

    //Checking if the current poll has been voted or not
    if(voted.includes(req.body.id)){
      let errors=[ { param: 'label_title[]',
        msg: "Your vote has been recorded. Thanks for your vote",
        value: undefined }];
      res.render('find_poll',{errors:errors});

    }else {//Current poll has not been voted

      //Finding poll and sending it to be voted upon
      var id=req.body.id;
      Poll.findById(id,(err,poll)=>{
        if(err) console.log(err);
        else{
          res.render('vote',{
            name:poll.name,
            labels:poll.labels,
            descriptions:poll.descriptions,
            id:poll._id
          });
        }
      });
    }
  }
});

module.exports=route;
