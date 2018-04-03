const nodemailer=require('nodemailer');
const route=require('express').Router();
const mongoose=require('mongoose');

require('../config/db.js');
const Poll=require('../models/poll.js');

//Handles GET request for creating poll form
route.get('/createPoll',function(req,res){
  res.render('createPoll');
});

//Finds and Show poll on poll_dashboard
route.get('/findandshow/:id',(req,res)=>{
  var pollID=req.params.id;
  Poll.findById(pollID,(err,poll)=>{
    res.render('poll_dashboard',{poll:poll});
  })
})

//Handles POST request of Create Poll form
route.post('/createPoll',function(req,res){
  var firstName=req.body.first_name;
  var lastName=req.body.last_name;
  var pollName=req.body.poll_name;
  var description=req.body.description;
  var email=req.body.email;
  var phone=req.body.phone;
  //checking for possible errors in form filling
  req.checkBody('first_name','First Name is required').notEmpty();
  req.checkBody('last_name','LastName is required').notEmpty();
  req.checkBody('poll_name','Poll Name is required').notEmpty();
  req.checkBody('description','Please enter details of the poll').notEmpty();
  req.checkBody('email','Email is required').notEmpty();
  req.checkBody('email','Invalid Email').isEmail();
  req.checkBody('phone','Phone number is Required').notEmpty();
  req.checkBody('phone','Invalid Phone Number').isInt().isLength({min:10, max:12});

  let errors=req.validationErrors();

  if(errors){
    res.render('createPoll',{
      errors:errors
    });
  }else {
          var newPoll={
            name:pollName,
            creatorFirstName:firstName,
            creatorLastName:lastName,
            creatorEmail:email
          }
          new Poll(newPoll).save().then(poll=> {
                var data=require('../config/data.js');

                var transporter =nodemailer.createTransport({
                  service:'gmail',
                  auth:{
                      type:'OAuth2',
                      user:'abekh19@gmail.com',
                      clientId:data.clientId,
                      clientSecret:data.clientSecret,
                      refreshToken:data.refreshToken
                  },
                  tls: {
                      rejectUnauthorized: false
                  }
                });

                var mailOptions={
                  from:'Poll Vault <poll_vault@gmail.com><noreply>',
                  to:email,
                  subject:'Poll-Vault',
                  text:`Greetings! Please click the button below to continue by adding labels to your poll.`,
                  html:`
                  <a href='http://pollvault.localtunnel.me/poll/add_label/${poll._id}' style="background-color: #f44336;
                  color: white;
                  padding: 14px 25px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;">Click Here to Add Titles</a>
                  `
                }

                transporter.sendMail(mailOptions,function(err,info)
              {
                if(err)
                console.log(err);
                else {
                  res.render('mail_sent');
                }
              });
          }).catch(err=>console.log(err));
}
});

//Handles add_label GET request sent from Email button
route.get('/add_label/:id',function(req,res){
    res.render('add_label',{
      id:req.params.id
    });
});

//Adds label to the poll for the first time
route.post('/add_label/:id',function(req,res){
  var titles,descriptions;
  //Getting all form entries in titles andd descriptions
  for (var key in req.body) {
    if(key=='label_title[]')
      titles=req.body[key];
    else {
      descriptions=req.body[key];
    }
  }

//Setting up errors object
  let errors=[ { param: 'label_title[]',
    msg: 'Titles cannot be empty',
    value: undefined }];
//Initiating votes array with all element zero
  var isEmpty=false;
  var votes=[];
  for(var i=0;i<titles.length;i++)
    votes[i]=0;
//Checking for empty title fields in form
  if(titles.length<2){
  titles.forEach(function(title){
    if(title=="")
      isEmpty=true;
  });
}

// If no titles or some title fields are empty
  if(titles.length== 0 || isEmpty==true){
    res.render('add_label',{
      id:req.params.id,
      errors:errors
    })
  }
  else {//Updating titles and descriptions based on form values
    Poll.findByIdAndUpdate(req.params.id,{labels:titles, descriptions:descriptions, votes:votes},{new:true},(err,poll)=>{
      if(err) console.log(err);
      else{
        res.render('poll_dashboard',{
          poll:poll
        });
      }
    });
  }

});

//Opens find_poll view
route.get('/vote',function(req,res){
    res.render('find_poll');
});

//Handles POST request of FindById form
route.post('/find_poll/byid',function(req,res){
  var id=req.body.poll_id;
  Poll.findById(id,(err,poll)=>{
    if(err) console.log(err);
    else {
      res.render('vote',{
        labels:poll.labels,
        descriptions:poll.descriptions,
        id:id
      })
    }
  });
});

//Handles POST request of FindByName form
route.post('/find_poll/byname',function(req,res){
  var name=req.body.poll_name;
  //Creating RegEx for name for fuzzy search
  const regex = new RegExp(escapeRegex(name), 'gi');
  Poll.find({name:regex},{},{sort:{created:-1}},(err,polls)=>{
    //If err or no such poll exists
    if(err | polls.length==0){
      let errors=[ { param: 'label_title[]',
        msg: `Poll with "${name}" Name doesn't exist `,
        value: undefined }];
      res.render('find_poll',{
        errors:errors
      });
    }//Polls exist matching name regex
    else {
      res.render('find_poll',{
        polls:polls
      })
    }
  });
});

//Creates Regular Expression for fuzzy search
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports=route;
