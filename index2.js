const express = require('express')
const { ETwitterStreamEvent, TweetStream, TwitterApi, ETwitterApiError, auth} =require('twitter-api-v2');
const axios  = require('axios')
const { response, json } = require('express')
const app = express()

const port = process.env.PORT || 3000


async function attachStream(){
       
    const client = new TwitterApi('AAAAAAAAAAAAAAAAAAAAAFz6hAEAAAAARD6nNnZn96aDoOuSD8i4%2F2MboVI%3DBOBLcdjiMcw1Vufj94s0oPWGiA2TNdmDCzMgFp7sLjpi8Fz1hK');
    const stream = client.v2.searchStream({ autoConnect: false, "tweet.fields": [
        "author_id"
    ], });

    const addedRules = await client.v2.updateStreamRules({
        add: [
          { value: '-is:retweet from:620757286 OR -is:retweet from:Nikhilvyas14 OR -is:retweet from:Pratyus35377059'},
          ],
      });
      
      const deleteRules = await client.v2.updateStreamRules({
        delete: {
          ids: ['1578282295315746816'],
        },
      });

    const rules = await client.v2.streamRules()
    console.log(rules.data.length)
    console.log(rules.data.map(rule => rule.id));
    stream.on(ETwitterStreamEvent.Data, (data)=>{
        console.log(data)
        console.log(data.data.id)
        
    });
    // Emitted only on initial connection success
    stream.on(ETwitterStreamEvent.Connected, () => console.log('Stream is started.'));

    // Start stream!
    await stream.connect({ autoReconnect: true, autoReconnectRetries: Infinity });
}

async function checkRetweets() {

    const retweetClient = new TwitterApi({
        appKey: 'K0xNtDv7VouUC294pBRPgAHdr',
        appSecret: '2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR',
        accessToken: '1258333066738704384-FHfZkEL8iQadDRUPrUVrL2RROriwKl',
        accessSecret: 'fPJp9RwaRoytRGK349gQ24KwdZZxqVAN4ge5runj7Osvj',
      });
      //const consumerClient = new TwitterApi({ appKey: 'K0xNtDv7VouUC294pBRPgAHdr', appSecret: '2aTC67swxHKP64SBCQBnnsfGKR5Ec0iWKoGR3eCV5V1thsoMsR' });
        // Obtain app-only client
        //const client = await consumerClient.appLogin();
        
      //const retweetClient = new TwitterApi('AAAAAAAAAAAAAAAAAAAAAFz6hAEAAAAARD6nNnZn96aDoOuSD8i4%2F2MboVI%3DBOBLcdjiMcw1Vufj94s0oPWGiA2TNdmDCzMgFp7sLjpi8Fz1hK');
      const createRetweet = await retweetClient.v2.retweet("1258333066738704384", "1578611971335028736")

      const createLike = await retweetClient.v2.like("1258333066738704384", "1578611971335028736")
    //   const createRetweet = await retweetClient.v2.usersIdRetweets("1258333066738704384",
    //   {
    //     //The ID of the tweet the user is requesting to retweet
    //     tweet_id: "1578305904558354432",
    //   })
      console.log(createRetweet)
      console.log(createLike)
}

app.listen(port , (req, res)=>{
    attachStream()
    //checkRetweets()
    console.log("Server started and running on port 3000")
})

