const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { ETwitterStreamEvent, TweetStream, TwitterApi, ETwitterApiError, auth} =require('twitter-api-v2');
const axios  = require('axios')
const { response, json } = require('express')

const app = express()

app.use(cors())

app.use(bodyParser.urlencoded({
    extended: true
  }));

app.use(express.json());


const port = process.env.PORT || 3000

// const twitterApi = new twitter({
//     consumer_key : "K0xNtDv7VouUC294pBRPgAHdr" ,
//     consumer_secret : "2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR",
//     access_token : "620757286-BPZuCXML1SXbmyECresO1cqs7dDgmOBnB6PngoQO",
//     access_token_secret : "kDaeOIFzfYDfBfetHad9TJgP2h2A0LZIjCkRMxuXTuf1P",
//     timeout_ms : 60 * 1000
// })

const client = new TwitterApi('AAAAAAAAAAAAAAAAAAAAAFz6hAEAAAAARD6nNnZn96aDoOuSD8i4%2F2MboVI%3DBOBLcdjiMcw1Vufj94s0oPWGiA2TNdmDCzMgFp7sLjpi8Fz1hK');
    

var stream
let userList = {}
let subscribersList = {}
let followList = ""
var streamIsConnectedStatus = ""

function fetchTwitterPublishers(){
    axios.get('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterPublishersData').then((response)=>{
       userList = JSON.parse(JSON.stringify(response.data))
    })  
}

function fetchTwitterSubscribers(){
    axios.get('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterSubscribersData').then((response)=>{
       subscribersList = JSON.parse(JSON.stringify(response.data))
    })  
}

async function setStream(){
      const rules = await client.v2.streamRules()

      var ruleIds = rules.data.map(rule => rule.id);
      
      const deleteRules = await client.v2.updateStreamRules({
        delete: {
          ids: ruleIds,
        },
      });

      const addedRules = await client.v2.updateStreamRules({
        add: [
          {value: followList},
          ],
      });
    
}


function doAllRetweets(subscribers, tweet){
    
    subscribers.forEach(async(element, key) => {
           
        const retweetClient = new TwitterApi({
            appKey: 'K0xNtDv7VouUC294pBRPgAHdr',
            appSecret: '2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR',
            accessToken:  subscribersList[element.twitterId].accessToken,
            accessSecret: subscribersList[element.twitterId].accessTokenSecret,
          });
        
        const createRetweet = await retweetClient.v2.retweet(element.twitterId, tweet.data.id)
        
        const createLike = await retweetClient.v2.like(element.twitterId, tweet.data.id)
        
        if(createRetweet.data.retweeted){
            subscribersList[element.twitterId].retweetsDoneCount = subscribersList[element.twitterId].retweetsDoneCount + 1
                axios.post('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/updateSubscriberReTweetCount', {
                            "twitterId" : element.twitterId ,
                            "count": subscribersList[element.twitterId].retweetsDoneCount
                })
        }

    });
}

function doCheckedRetweets(subscribers, tweet){
    console.log(tweet.data.id)
    console.log("do check retweets")
    subscribers.forEach(async(element, key) => {
       console.log("inside----------------------------")
      if((subscribersList[element.twitterId].isPaidForDoingRetweet || subscribersList[element.twitterId].retweetsDoneCount<10)
         && subscribersList[element.twitterId].isAllowedAutomaticRetweets){
         
            console.log("eddddddddddddddddddddddddddddddd")
        
            const retweetClient = new TwitterApi({
                appKey: 'K0xNtDv7VouUC294pBRPgAHdr',
                appSecret: '2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR',
                accessToken: subscribersList[element.twitterId].accessToken,
                accessSecret: subscribersList[element.twitterId].accessTokenSecret,
              });
        //const retweetClient = new TwitterApi('VmhScjVzQTJ5QXNvZUVZMGZkSDR0dl9wNTg5NTB6dThfeTU4QmQzeUJQUmtqOjE2NjYwMDY5ODA3OTA6MToxOmF0OjE');
        console.log("confirmmmmmm")
        var createRetweet
        try{
         createRetweet = await retweetClient.v2.retweet(element.twitterId, tweet.data.id)
        }
        catch(e){
            console.log(e)
        }
        const createLike = await retweetClient.v2.like(element.twitterId, tweet.data.id)
        console.log(createRetweet.data.retweeted)
        if(createRetweet.data.retweeted){
            subscribersList[element.twitterId].retweetsDoneCount = subscribersList[element.twitterId].retweetsDoneCount + 1 
                axios.post('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/updateSubscriberReTweetCount', {
                            "twitterId" : element.twitterId ,
                            "count": subscribersList[element.twitterId].retweetsDoneCount
                })
        }
       }
      });
}

 function addInFollowList(Id){
  if(followList == ""){
    followList = followList + "-is:retweet from:" + Id;
    setStream()
  }
  else{
    if(!followList.includes(Id)){
    followList = followList + " OR " + "-is:retweet from:" + Id;
    setStream()
    }
  }
 }

 function removeInFollowList(Id){
    if(followList.includes("-is:retweet from:" + Id + " OR ")){
        followList = followList.replace("-is:retweet from:" + Id + " OR ", "");
      }
      else{
        followList = followList.replace(" OR -is:retweet from:" + Id, "");
      }
      followList = followList.trim()
  setStream()
}




function attachStreamOnPublisherData(){
    axios.get('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterPublishersString').then(async (response)=>{
    followList = response.data
    //followList = '-is:retweet from:620757286 OR -is:retweet from:Nikhilvyas14 OR -is:retweet from:Pratyus35377059'
    
    
    if(followList==="")
        followList = "1"
        
        console.log(followList)  
        
        stream = client.v2.searchStream({ autoConnect: false, "tweet.fields": [
            "author_id"
        ], });
        
        const addedRules = await client.v2.updateStreamRules({
            add: [
              { value: followList},
              ],
          });
        //   const rules = await client.v2.streamRules()

        //   var ruleIds = rules.data;
        //   const deleteRules = await client.v2.updateStreamRules({
        //     delete: {
        //       ids: ['1578672423334858753'],
        //     },
        //   });
    
        //   console.log(ruleIds)
        
        stream.on(ETwitterStreamEvent.Data, (tweet)=>{
          console.log("tweet captured") 
          console.log(tweet)
          
          userList[tweet.data.author_id].TweetsCapturedCount = userList[tweet.data.author_id].TweetsCapturedCount + 1 
          let subscribers = new Map(Object.entries(userList[tweet.data.author_id].subscriberIds))
          console.log(">>>>>>>>>>>>>")
          console.log(subscribers)
          console.log(userList[tweet.data.author_id].TweetsCapturedCount)
          console.log(">>>>>");
          axios.post('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/updatePublisherTweetCount', {
            "twitterId": tweet.data.author_id,
            "count": userList[tweet.data.author_id].TweetsCapturedCount
          })
          console.log("111222222221")
          console.log("111111111111")
          if(userList[tweet.data.author_id].isAuthenticated){
            console.log("if")
            if((userList[tweet.data.author_id].isPaidToIncreaseReach || userList[tweet.data.author_id].TweetsCapturedCount<=10)
                && userList[tweet.data.author_id].isAllowedToIncreaseReachRetweets){
              doAllRetweets(subscribers, tweet)
            }
          }
          else{
            console.log("else")
             doCheckedRetweets(subscribers, tweet)
          }
         })  
        
        stream.on(ETwitterStreamEvent.Error, async (error)=> {
            console.log("Error in Stream")
            streamIsConnectedStatus = "error in Stream"
             console.log(error)
            // await stream.close()
            // await stream.reconnect()
            //attachStreamOnPublisherData()
        });

        stream.on(ETwitterStreamEvent.ConnectionLost, (disconnectmsg)=>{
           console.log("disconnect in Stream")
           streamIsConnectedStatus = "disconnect in Stream"
           attachStreamOnPublisherData()
        })

        stream.on(ETwitterStreamEvent.ConnectionClosed, (disconnectmsg)=>{
            console.log("Stream is closed")
            streamIsConnectedStatus = "Stream is closed"
         })
    
        
        stream.on(ETwitterStreamEvent.Connected, () => {
            console.log('Stream is started.')
            streamIsConnectedStatus = "stream Is started"
        });

        await stream.connect({ autoReconnect: true, autoReconnectRetries: 10 });
    })   
}


app.get("/", (req, res)=>{
    res.status(200).send("Hello From QuickReach");
})

app.post("/onSubscriberAddInPublisher", (req, res)=>{
    console.log("User Deleted")
    
    const twitterPublisherId = req.body["twitterId"];
    const twitterSubscriberId = req.body["subscriberId"];
    // const accessToken =  req.body["accessToken"];
    // const accessTokenSecret = req.body["accessTokenSecret"];
    if(userList[twitterPublisherId].subscriberIds == undefined){
        userList[twitterPublisherId].subscriberIds = {}
    }
    userList[twitterPublisherId].subscriberIds[twitterSubscriberId] = {
      "twitterId" : twitterSubscriberId
    }
    
    addInFollowList(twitterPublisherId)
    res.status(200).send("User Deleted");
})


app.post("/onSubscriberDeleteInPublisher", (req, res)=>{
    console.log("onSubscriberDeleteInPublisher")
    
    const twitterPublisherId = req.body["twitterId"];
    const twitterSubscriberId = req.body["subscriberId"];

    delete userList[twitterPublisherId].subscriberIds[twitterSubscriberId]

    if(userList[twitterPublisherId].subscriberIds[twitterSubscriberId] == undefined){
        removeInFollowList(twitterPublisherId)
    }
    else if( Object.keys(userList[twitterPublisherId].subscriberIds[twitterSubscriberId]).length==0){
        removeInFollowList(twitterPublisherId)
    }
    res.status(200).send("onSubscriberDeleteInPublisher");
})

app.post("/onSubscriberAdd", (req, res)=>{
    console.log("subscriber added")
    
    const twitterSubscriberId = req.body["twitterId"];
    
    subscribersList[twitterSubscriberId] = req.body
    
    res.status(200).send("subscriber added");
})

app.post("/onPublisherAdd", (req, res)=>{
    console.log("subscriber added")
    
    const twitterPublisherId = req.body["twitterId"];
    
    userList[twitterPublisherId] = req.body
    
    res.status(200).send("publisher added");
})


app.post("/onPaymentChangeInPublisher", (req, res)=>{
    console.log("onPaymentChangeInPublisher")
    
    const twitterPublisherId = req.body["twitterId"]
    const planPurchaseDate = req.body["planPurchaseDate"];
    const isPaidToIncreaseReach = req.body["isPaidToIncreaseReach"];
    const typeOfPlanPurchased = req.body["typeOfPlanPurchased"];

    userList[twitterPublisherId].planPurchaseDate = planPurchaseDate
    userList[twitterPublisherId].isPaidToIncreaseReach = isPaidToIncreaseReach
    userList[twitterPublisherId].typeOfPlanPurchased = typeOfPlanPurchased
    
    if(!isPaidToIncreaseReach){
        removeInFollowList(twitterPublisherId)    
    }
    else{
        addInFollowList(twitterPublisherId)
    }
    res.status(200).send("onPaymentChangeInPublisher");
})

app.post("/onPaymentChangeInSubscriber", (req, res)=>{
    const twitterSubscriberId = req.body["twitterId"]
    const planPurchaseDate = req.body["planPurchaseDate"];
    const isPaidForDoingRetweet = req.body["isPaidForDoingRetweet"];
    const typeOfPlanPurchased = req.body["typeOfPlanPurchased"];

    subscribersList[twitterSubscriberId].planPurchaseDate = planPurchaseDate
    subscribersList[twitterSubscriberId].isPaidForDoingRetweet = isPaidForDoingRetweet
    subscribersList[twitterSubscriberId].typeOfPlanPurchased = typeOfPlanPurchased
    
    res.status(200).send("onPaymentChangeInSubscriber");
})

app.post("/onIsAllowedToIncreaseReachChangeInPublisher", (req, res)=>{
    
    const twitterPublisherId = req.body["twitterId"]
    const IsAllowedToIncreaseReach = req.body["isAllowedToIncreaseReachRetweets"]

    userList[twitterPublisherId].isAllowedToIncreaseReachRetweets = IsAllowedToIncreaseReach
    if(!IsAllowedToIncreaseReach){
        removeInFollowList(twitterPublisherId)
    }
    else{
        addInFollowList(twitterPublisherId)
    }

    res.status(200).send("onIsAllowedToIncreaseReachChangeInPublisher");
})

app.post("/onIsAllowedAutoRetweetsChangeInSubscriber", (req, res)=>{
    const twitterSubscriberId = req.body["twitterId"]
    const IsAllowedAutoRetweets = req.body["isAllowedAutomaticRetweets"];

    subscribersList[twitterSubscriberId].isAllowedAutomaticRetweets = IsAllowedAutoRetweets
    res.status(200).send("onIsAllowedAutoRetweetsChangeInSubscriber");
})

app.get("/testPublisherList", (req, res)=>{
    console.log("publisher List")
    console.log(userList)
    res.status(200).send(userList);
})

app.get("/testSubscriberList", (req, res)=>{
    console.log("Subscriber List")
    console.log(subscribersList)
    res.status(200).send(subscribersList);
})

app.get("/testFollowList", (req, res)=>{
    console.log("Follow List")
    console.log(followList)
    res.status(200).send(followList);
})

app.get("/getStreamRules", async(req, res)=>{
    const rules = await client.v2.streamRules()
  
    res.status(200).send(rules);
})

app.get("/attachStreamConnection", async(req, res)=>{
    attachStreamOnPublisherData();
    res.status(200).send("startStreamConnection");
})

app.get("/connectStreamConnection", async(req, res)=>{
    stream.connect({ autoReconnect: true, autoReconnectRetries: 10 })
    res.status(200).send("connectStreamConnection");
})

app.get("/closeStreamConnection", async(req, res)=>{
    stream.close()
    res.status(200).send("stream is closed");
})

app.get("/destroyStreamConnection", async(req, res)=>{
    stream.destroy()
    res.status(200).send("stream is destroyed");
})

app.get("/statusStreamConnection", async(req, res)=>{
    res.status(200).send(streamIsConnectedStatus);
})

app.get("/restartFetching", async(req, res)=>{
    fetchTwitterPublishers()
    fetchTwitterSubscribers()
    res.status(200).send("restart fetching");
})

app.listen(port , (req, res)=>{
    fetchTwitterPublishers()
    fetchTwitterSubscribers()
    attachStreamOnPublisherData()
    console.log("Server started and running on port 3000")
})