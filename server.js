//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var express = require('express')
var request = require("request");


var MongoClient = mongodb.MongoClient;
var mongoURL = 'mongodb://sergeytest:1964@ds019766.mlab.com:19766/searchwrapper';    
console.log(mongoURL);
//process.env.MONGOLAB_URI//'
var app = express();

app.get('/',function(req,res){
  res.send("Pass a string to /API to search for images, or pass /API/latest to see recent searches")  
});
app.get("/API/recent",function showRecentQueries (req,res) {
 MongoClient.connect(mongoURL, function (err, db) {
          if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
          } else {
            console.log('Connection established to', mongoURL);
            var searches = db.collection("searches");
            searches.find({},{"_id":0,"timestamp":1,searchTerm:1}).toArray(function(err,found){
              if (err) console.error(err)
              res.send(JSON.stringify(found));   
              console.log("showing recent results")
              db.close()
            })
          }
        });
});
app.get('/API/new/:QUERY',function readUserQuery (req,res){
    
    var query = req.params.QUERY;
    var googleString = "https://www.googleapis.com/customsearch/v1?cx=009689499259443468607%3Ariqzu-m5uq4&searchType=image&key=AIzaSyDgxg-UlpyPHNMFEeWRJ9zfecrjEUUIS9w&q=" + query
          request({
        uri: googleString,
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
      }, function fetchFromGoogle(error, response, body) {
        console.log(body.items,body.url);
        var resArray = JSON.parse(body).items;
        var filteredArray = resArray.map(function extractInfo(item,index){
          var newItem = {};
          newItem.imageURL = item.link;
          newItem.snippet= item.snippet;
          newItem.pageURL = item.image.contextLink
          return newItem
        })
        
        res.write(JSON.stringify(filteredArray))
        
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
});


var port = +process.env.PORT
if (!port) port = 8080;

app.listen(port, function () {console.log(process.env.PORT,process.env.IP);
  //  console.log(process.env);
  console.log('Example app listening on port 8080!');
});
