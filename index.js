const express= require('express');
const bodyParser=require('body-parser');
const path=require('path');
const validator=require('express-validator');
const cookieParser=require('cookie-parser');

//Initializing application
const app= express();

//View Engine setup
app.set('views',path.join(__dirname,'views'));
app.set('view engine','pug');

//bodyParser middleware
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

//Loading static assets
app.use(express.static(path.join(__dirname,'public')));

//Cookie managememnt using Cookie-parser
app.use(cookieParser());


//Express-validator Middleware
app.use(validator({
  errorFormatter:function(param,msg,value)
  {
    var namespace=param.split('.')
    , root=namespace.shift()
    ,formParam=root;

    while(namespace.length){
      formParam+='['+namespace.shift()+']';
    }
    return{
      param:formParam,
      msg:msg,
      value:value
    }
  },
  customValidators: {
     arrayNotEmpty: function(array) {
       Array.isArray(array) &&
       array.length > 0;
     }
  }

}));

//Home route
app.get('/',function(req,res){
  res.render('index');
});

//Using pollRoute for /poll/ requests
var pollRoute=require('./routes/poll.js');
app.use('/poll/',pollRoute);

//Using pollRoute for /vote/ requests
var voteRoute=require('./routes/vote.js');
app.use('/vote/',voteRoute);

var port=4000;
app.listen(port,()=>console.log('Server running on '+port));
