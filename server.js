//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var express = require('express');
var request = require("request");
var url = require('url')

var MongoClient = mongodb.MongoClient;
var mongoURL = 'mongodb://sergeytest:1964@ds019766.mlab.com:19766/searchwrapper';    
console.log(mongoURL);
//process.env.MONGOLAB_URI//'
var app = express();

app.get('/',function(req,res){
  res.send("Pass a string to /API/new to search for images, or pass /API/recent to see recent searches. To limit the number of responses, add '?offset={NUMBER}' to the end of your query (defaults to 10 in both cases, valid numbers for new searches are from 1 to 10, for browsing recent queries  - from 1 to 100; any numbers larger than that will be forciby converted to 10 and 100 respectively).")  
});
app.get("/API/recent",function (req,res) {
  getRecentQueries(req,res)
});
app.get("/API/recent?:PARAMS",function (req,res) {
  getRecentQueries(req,res)
});
app.get('/API/new/:QUERY',function (req,res){
    processUserQuery(req,res)
});
app.get('/API/new/:QUERY?:PARAMS',function (req,res){
    processUserQuery(req,res)
});

function getRecentQueries(req,res) {
  var queryObject = url.parse(req.url,true).query;
  var num = +queryObject.offset||20;
  if (num >100) num = 100;
  MongoClient.connect(mongoURL, function (err, db) {
          if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
          } else {
            console.log('Connection established to', mongoURL);
            var searches = db.collection("searches");
            searches.find({},{"_id":0,"timestamp":1,searchTerm:1}).sort({ _id: -1 }).limit(num).toArray(function(err,found){
              if (err) console.error(err)
              res.send(JSON.stringify(found));   
              console.log("showing recent results")
              db.close()
            })
          }
        });
}

function processUserQuery(req,res){
      var queryObject = url.parse(req.url,true).query;
      var num = +queryObject.offset||10;
      if (num >10) num = 10;
      var query = req.params.QUERY;
      var googleString = "https://www.googleapis.com/customsearch/v1?cx=009689499259443468607%3Ariqzu-m5uq4&searchType=image&key=AIzaSyDgxg-UlpyPHNMFEeWRJ9zfecrjEUUIS9w&" +  "q=" + query + ((num)?('&num=' + num):'')
      console.log(googleString);
          request({
        uri: googleString,
        method: "GET",
        timeout: 5000,
        followRedirect: true,
        maxRedirects: 10
      }, function fetchFromGoogle(error, response, body) {
        //console.log(body);
        var resArray = JSON.parse(body).items;
        var filteredArray = resArray.map(function extractInfo(item,index){
          var newItem = {};
          newItem.imageURL = item.link;
          newItem.snippet= item.snippet;
          newItem.pageURL = item.image.contextLink
          return newItem
        })
        //display results
        res.send(JSON.stringify(filteredArray))
        
        //write to db
         MongoClient.connect(mongoURL, function writeToDb (err, db) {
          if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
          } else {
            console.log('Connection established to', mongoURL," for writing");
            var searches = db.collection("searches");
            searches.insert({searchTerm:query,timestamp:Date()})
            db.close();
          }
        });
      });
}

var port = +process.env.PORT||8080;
//if (!port) port = 8080;

app.listen(port, function () {console.log(process.env.PORT,process.env.IP);
  //  console.log(process.env);
  console.log('Example app listening on port 8080!');
});
