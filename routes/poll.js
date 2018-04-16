const nodemailer=require('nodemailer');
const route=require('express').Router();
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
var request = require('request');
var salt = bcrypt.genSaltSync(10);

//config file for database
require('../config/db.js');
const Poll=require('../models/poll.js');

//gmail api credentials
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
});
route.post('/findandshow',(req,res)=>{
  var name=req.body.name;
  Poll.findOne({name:name}, (err,poll)=>{
    if(err) console.log(err);
    else if(poll==null){
      res.render('index',{
        err1:"That Poll doesn't exist." ,
        err2:"Maybe you misspelled it !"
      });
    }
    else {
      res.render('poll_dashboard',{
        poll:poll,
        fromIndexPage:true
      })
    }
  });
});

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

                var mailOptions={
                  from:'Poll Vault <poll_vault@gmail.com><noreply>',
                  to:email,
                  subject:'Poll-Vault',
                  text:`Greetings! Please click the button below to continue by adding labels to your poll.`,
                  html:`
                  <a href='http://localhost:4000/poll/add_label/${poll._id}' style="background-color: #f44336;
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
          }).catch((err)=>console.log(err));
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
  votes.fill(0,0,titles.length);
  //for(var i=0;i<titles.length;i++)
    //votes[i]=0;
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
    var hash = bcrypt.hashSync(req.params.id, salt);
    Poll.findByIdAndUpdate(req.params.id,{labels:titles, descriptions:descriptions, votes:votes,hash:hash},{new:true},(err,poll)=>{
      if(err) res.render('error');
      else{
        var mailOptions={
          from:'Poll Vault <poll_vault@gmail.com><noreply>',
          to:poll.creatorEmail,
          subject:'Poll-Vault - Labels Added',
          text:`Thanks for completing the process. Before you begin please share the ID provided to all the contributors
          you want to permit adding of labels before you begin voting for the Poll.
          You can also share the ID given below and ask them to enter it in Add Labels to Onging Poll link`,
          html:`
              <p>Thanks for completing the process. Before you begin please share the ID provided to all the contributors
              you want to permit adding of labels <strong>before you begin voting</strong> for the Poll.<br>
              You shouldshare the ID given below and ask them to enter it in Add Labels to Ongoing Poll link</p>
              <br>
              <br>
              <a style="text-decoration:underline; margin-top:20px;">ID : ${poll._id}</a>
              <a style="text-decoration:underline; margin-top:20px;">Secret : ${hash}</a>
              `
        }

        transporter.sendMail(mailOptions,function(err,info)
        {
            if(err)
              console.log(err);
            else {
              res.render('poll_dashboard',{
                poll:poll
              });
            }
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
    if(err) res.render('error');
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

//Editing labels index page link
route.get('/insertLabel',(req,res)=>{
  res.render('editLabel');
});

// **POST** request to Add labels to ongoing poll
route.post('/insertLabel',(req,res)=>{
//Getting Form variables
  var hash=req.body.secret;
  var id=req.body.id;
//Finding POLL by given ID
  Poll.findById(id,(err,poll)=>{
/*if there is an error and it is a TypeCast error(id provided is not a valid ID OBject type)
* OR if no such poll exists
* OR no ID or HASH is entered in the form
*/
    if((err && (err.name=='CastError')) || poll==null ||id=='' || hash==''){
      let errors=[ { param: 'label_title[]',
        msg: `Invalid ID or Secret `,
        value: undefined }];
      res.render('editLabel',{
        errors:errors
      });
    }else {
//Comparing hash secret with id, only proceeding if true
      if(bcrypt.compareSync(id, hash)){
        var votes=poll.votes;//Grabing votes array from the database
        var condition= votes.find((element)=>(element)>0);//Checking if any entry is >0

        if(condition==undefined){//No element in votes >0
          let errors=[ { param: 'label_title[]',
            msg: `Please update the labels as the voting has not started yet. Once the voting will start you won't be able to insert anymore labels.`,
            value: undefined }];
          return res.render('add_label_edit',{id:id,errors:errors});
        }else {//Some elements of votes>0 means someone has already voted(Voting has started)
          let errors=[ { param: 'label_title[]',
            msg: `Voting has already started. You can not add more Labels now !`,
            value: undefined }];
          res.render('index',{
            errors:errors
          });
        }
      }
//Comparing of hash and ID returened false
      else {
        let errors=[ { param: 'label_title[]',
          msg: `Invalid ID or Secret `,
          value: undefined }];
        res.render('editLabel',{
          errors:errors
        });
      }
    }
  });
});

//Add_Label_Edit POST Route
route.post('/add_label_edit/:id',(req,res)=>{
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
  //Checking for empty title fields in form
    if(titles.length<2){
    titles.forEach(function(title){
      if(title=="")
        isEmpty=true;
    });
  }
  // If no titles are present or some title fields are empty
    if(titles.length== 0 || isEmpty==true){
      res.render('add_label_edit',{
        id:req.params.id,
        errors:errors
      });
    }else {//Creating empty dummy arrays to be populated later
      var oldTitles=[],oldDescriptions=[],votes=[];
      //Finding the poll BY ID to use existing values
      Poll.findById(req.params.id,(err,poll)=>{
        if(err){
          res.render('error');
        }else {
          oldTitles=poll.labels;
          oldDescriptions=poll.descriptions;
          votes=poll.votes;
          //If there is only one title which will be a string not an array so,
          if(typeof titles == 'string'){
            oldTitles[oldTitles.length]=titles;
            oldDescriptions[oldTitles.length]=descriptions;
            votes[oldTitles.length]=0;
          }else {//Titles and descriptions from the forms are infact arrays
            var count=oldTitles.length;//Length of existing elements in labels
            //Concating oldTitles , oldDescriptions with new values.Adding 0 to votes accordingly
            for(var x=0;x<titles.length;x++){
              oldTitles[count+x]=titles[x];
              oldDescriptions[count+x]=descriptions[x];
              votes[count+x]=0;
            }
          }//Updating the poll with new labels,descriptions,votes arrays
          Poll.findByIdAndUpdate(req.params.id,{labels:oldTitles,descriptions:oldDescriptions,votes:votes},{new:true},(err,poll)=>{
            res.render('poll_dashboard',{poll:poll,fromIndexPage:true});
          });
        }
      });
    }
});


//Creates Regular Expression for fuzzy search
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports=route;
