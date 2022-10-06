const express = require('express')
const twit = require('twit')
const axios  = require('axios')
const { response, json } = require('express')
const app = express()

const port = process.env.PORT || 3000

const twitterApi = new twit({
    consumer_key : "K0xNtDv7VouUC294pBRPgAHdr" ,
    consumer_secret : "2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR",
    access_token : "620757286-BPZuCXML1SXbmyECresO1cqs7dDgmOBnB6PngoQO",
    access_token_secret : "kDaeOIFzfYDfBfetHad9TJgP2h2A0LZIjCkRMxuXTuf1P",
    timeout_ms : 60 * 1000
})

var stream
let userList = {}
let subscribersList = {}
let followList = ""

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

function setStream(){
    stream  = twitterApi.stream('statuses/filter', {
        follow: followList
    })
}

function doAllRetweets(subscribers, tweet){
    subscribers.forEach((element, key) => {
            
        var retweetCred = new twit({
            consumer_key : "K0xNtDv7VouUC294pBRPgAHdr" ,
            consumer_secret : "2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR",
            access_token : element.accessToken,
            access_token_secret : element.accessTokenSecret,
            timeout_ms : 60 * 500
        })

        retweetCred.post("statuses/retweet/:id",{
            id: tweet.id_str
            },
        
            (err, data, res)=>{
                console.log("Retweeted");
                subscribersList[element.twitterId].retweetsDoneCount = subscribersList[element.twitterId].retweetsDoneCount + 1
                axios.post('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterPublishersString/updateSubscriberReTweetCount', {
                            "twitterId" : element.twitterId ,
                            "count": subscribersList[element.twitterId].retweetsDoneCount
                })
            }
        )
        
        retweetCred.post("favorites/create",{
            id: tweet.id_str
            },
        
            (err, data, res)=>{
                console.log("Retweeted");
            }
        )
      });
}

function doCheckedRetweets(subscribers, tweet){
    
    subscribers.forEach((element, key) => {
       
      if((subscribersList[element.twitterId].isPaidForDoingRetweet || subscribersList[element.twitterId].retweetsDoneCount)
         && subscribersList[element.twitterId].isAllowedAutomaticRetweets){

        var retweetCred = new twit({
            consumer_key : "K0xNtDv7VouUC294pBRPgAHdr" ,
            consumer_secret : "2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR",
            access_token : element.accessToken,
            access_token_secret : element.accessTokenSecret,
            timeout_ms : 60 * 500
        })

        retweetCred.post("statuses/retweet/:id",{
            id: tweet.id_str
            },
        
            (err, data, res)=>{
                console.log("Retweeted");
                subscribersList[element.twitterId].retweetsDoneCount = subscribersList[element.twitterId].retweetsDoneCount + 1 
                axios.post('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterPublishersString/updateSubscriberReTweetCount', {
                            "twitterId" : element.twitterId ,
                            "count": subscribersList[element.twitterId].retweetsDoneCount
                })
            }
        )
        
        retweetCred.post("favorites/create",{
            id: tweet.id_str
            },
        
            (err, data, res)=>{
                console.log("Retweeted");
            }
        )
      }
      });
}

function attachStreamOnPublisherData(){
    axios.get('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterPublishersString').then((response)=>{
    followList = response.data
    
        
        if(followList==="")
        followList = "1"
        
        console.log(followList)  
        
        stream  = twitterApi.stream('statuses/filter', {
            follow: followList
        })
        
        stream.on('tweet', (tweet)=>{
          console.log("tweet captured") 
          console.log(tweet)
          
          userList[tweet.user.id_str].TweetsCapturedCount = userList[tweet.user.id_str].TweetsCapturedCount + 1 
          
          axios.post('https://us-central1-quickreach-aed40.cloudfunctions.net/restApis/getTwitterPublishersString/updatePublisherTweetCount', {
            "twitterId" : tweet.user.id_str ,
            "count": userList[tweet.user.id_str].TweetsCapturedCount
          })

          let subscribers = new Map(Object.entries(userList[tweet.user.id_str].subscriberIds))
          
          if(userList[tweet.user.id_str].isAuthenticated){
            
            if((userList[tweet.user.id_str].isPaidToIncreaseReach || userList[tweet.user.id_str].TweetsCapturedCount<=10)
                && userList[tweet.user.id_str].isAllowedToIncreaseReachRetweets){
              doAllRetweets(subscribers, tweet)
            }
          }
          else{
             doCheckedRetweets(subscribers, tweet)
          }
         })  
        
        stream.on("disconnect", (disconnectmsg)=>{
          stream.stop()  
          stream.start()
        })

        stream.on("warning", (warning)=>{
            stream.stop()
            stream.start()
        })
    })   
}


app.get("/", (req, res)=>{
    res.status(200).send("Hello From QuickReach");
})

app.post("/onSubscriberAddInPublisher", (req, res)=>{
    console.log("User Deleted")
    
    const twitterPublisherId = req.body["twitterId"];
    const twitterSubscriberId = req.body["subcriberId"];
    const accessToken =  req.body["accessToken"];
    const accessTokenSecret = req.body["accessTokenSecret"];
    userList[twitterPublisherId].subscriberIds[twitterSubscriberId] = {
      "accessToken" : accessToken,
      "accessTokenSecret" : accessTokenSecret,
      "twitterId" : twitterSubscriberId
    }
    
    followList = followList + twitterPublisherId + ",";
    setStream()
    res.status(200).send("User Deleted");
})


app.post("/onSubscriberDeleteInPublisher", (req, res)=>{
    console.log("onSubscriberDeleteInPublisher")
    
    const twitterPublisherId = req.body["twitterId"];
    const twitterSubscriberId = req.body["subcriberId"];

    delete userList[twitterPublisherId].subscriberIds[twitterSubscriberId]

    if(userList[twitterPublisherId].subscriberIds[twitterSubscriberId] == undefined){
        followList = followList.replace(twitterPublisherId + ",", "");
        setStream()
    }
    else if( Object.keys(userList[twitterPublisherId].subscriberIds[twitterSubscriberId]).length==0){
        followList = followList.replace(twitterPublisherId + ",", "");
        setStream()
    }
    res.status(200).send("onSubscriberDeleteInPublisher");
})

app.post("/onSubscriberAdd", (req, res)=>{
    console.log("subscriber added")
    
    const twitterSubscriberId = req.body["twitterId"];
    
    subscribersList[twitterSubscriberId] = req.body
    
    res.status(200).send("subscriber added");
})


app.post("/onPaymentChangeInPublisher", (req, res)=>{
    console.log("onPaymentChangeInPublisher")
    
    const twitterPublisherId = req.body["twitterId"]
    const planPurchaseDate = req.body["planPurchaseDate"];
    const isPaidToIncreaseReach = req.body["isPaidToIncreaseReach"];
    const typeOfPlanPurchased = req.body["typeOfPlanPurchased"];

    subscribersList[twitterPublisherId].planPurchaseDate = planPurchaseDate
    subscribersList[twitterPublisherId].isPaidToIncreaseReach = isPaidToIncreaseReach
    subscribersList[twitterPublisherId].typeOfPlanPurchased = typeOfPlanPurchased
    
    if(!isPaidToIncreaseReach){
        followList = followList.replace(twitterPublisherId + ",", "");
        setStream()
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
        followList = followList.replace(twitterPublisherId + ",", "");
        setStream()
    }

    res.status(200).send("onIsAllowedToIncreaseReachChangeInPublisher");
})

app.post("/onIsAllowedAutoRetweetsChangeInSubscriber", (req, res)=>{
    const twitterSubscriberId = req.body["twitterId"]
    const IsAllowedAutoRetweets = req.body["isAllowedAutomaticRetweets"];

    subscribersList[twitterSubscriberId].isAllowedAutomaticRetweets = IsAllowedAutoRetweets
    res.status(200).send("onIsAllowedAutoRetweetsChangeInSubscriber");
})

app.post("/testPublisherList", (req, res)=>{
    console.log("publisher List")
    console.log(userList)
    res.status(200).send(userList);
})

app.post("/testSubscriberList", (req, res)=>{
    console.log("Subscriber List")
    console.log(subscribersList)
    res.status(200).send(subscribersList);
})

app.post("/testFollowList", (req, res)=>{
    console.log("Follow List")
    console.log(followList)
    res.status(200).send(followList);
})

app.listen(port , (req, res)=>{
    fetchTwitterPublishers()
    fetchTwitterSubscribers()
    attachStreamOnPublisherData()
    console.log("Server started and running on port 3000")
})