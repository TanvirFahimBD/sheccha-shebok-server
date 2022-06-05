const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;
// STRIPE_SECRET=sk_test_51L6u7WFgsutIdwUumMVOPUwYY59uIRyXwS3QKLg7Prb1oG5X7FLsGcfXBAXYcgdCcHIAXvozu7WSWWcAZjCgtEXa00ORWdF8pa
const stripe = require("stripe")('sk_test_51L6u7WFgsutIdwUumMVOPUwYY59uIRyXwS3QKLg7Prb1oG5X7FLsGcfXBAXYcgdCcHIAXvozu7WSWWcAZjCgtEXa00ORWdF8pa')

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hqjnl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function verifyToken(req, res, next){
  if(req?.headers?.authorization?.startsWith('Bearer ')){
    const token = req?.headers?.authorization?.split(' ')[1];
    try{
     const decodedUser = await admin.auth().verifyIdToken(token)
     req.decodedEmail = decodedUser.email;
    }
    catch{

    }
  }
  next();
}


 
async function run() {
  try {
    await client.connect();
    const database = client.db("humanityHand");
    const eventCollection = database.collection("events");
    const eventRegisterCollection = database.collection("eventRegister");
    const usersCollection = database.collection("users");

      //payment POST API
      app.post("/create-payment-intent",  async (req, res) => {
        const paymentInfo = req.body;
        // console.log("server paymentInfo", paymentInfo)
        const amount = paymentInfo?.amount * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          currency: "usd",
          amount: amount,
          payment_method_types: ['card']
        }); 
        res.json({
          clientSecret: paymentIntent.client_secret,
        }); 
        
      })


    //users POST API
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.json(result);
    });

    //users POST API
    app.get("/users", async (req, res) => {
      const result = await usersCollection?.find({})?.toArray();
      res.send(result);
    });

    //users PUT API
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = {email: user.email}
      const options = {upsert: true}
      const updateDoc = { $set:  user }
      const result = await usersCollection.updateOne(filter, updateDoc , options);
      res.json(result);
    });

    //users -> admin PUT API
    app.put("/users/admin", verifyToken , async (req, res) => {
      const requester = req.decodedEmail; 
      if(requester){
        const requesterAccount = await usersCollection.findOne({email: requester});
        if(requesterAccount.role === 'admin'){
          const user = req.body;
          const filter = {email: user.email}
          const updateDoc = { $set:  {role: "admin"} }
          const result = await usersCollection.updateOne(filter, updateDoc );
          res.json(result);
        }
      }
      else{
        res.status(403).json({message: 'you do not have access to make admin'})
      }     
    });

    // users GET API
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const user = await  usersCollection.findOne(query);
      let isAdmin = false
      if(user?.role === 'admin'){
        isAdmin = true
      }
      res.json({admin: isAdmin});
    });

    // events GET API
    app.get("/events", async (req, res) => {
      const cursor = eventCollection.find({});
      const events = await cursor.toArray();
      res.send(events);
    });

    // events Single GET API
    app.get("/events/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: ObjectId(id) };
      const result = await eventCollection.findOne(query);
      // console.log("id", result);
      res.json(result);
    });

  // events POST API
  app.post("/events", async (req, res) => {
    const newEvent = req.body;
    const result = await eventCollection.insertOne(newEvent);
    // console.log("newEvent", req.body);
    // console.log("result", result);
    res.json(result);
  });

    //events DELETE API
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      // console.log("id", id)
      const query = { _id: ObjectId(id) };
      const result = await eventCollection.deleteOne(query);
      // console.log("id", result);
      res.json(result);
    });

      // events Single PUT API
      app.put("/events/:id", async (req, res) => {
        const id = req.params.id;
        const event = req.body;
        // console.log("event", event);
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            title: event.title,
            desc: event.desc,
            banner: event.banner,
            date: event.date,
          },
        };
        const result = await eventCollection.updateOne(filter, updateDoc, options);
        // console.log("result", result);
        res.json(result);
      });

    //register Single GET API
    app.get("/register", verifyToken, async (req, res) => {
      const query = {};
      const result = await eventRegisterCollection.find(query).toArray();
      // console.log("result", result);
      res.json(result);
      console.log(req.decodedEmail);
    });
  
    //register Single GET by email API
    app.get("/register/:email", async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const result = await eventRegisterCollection.find(query).toArray();
      // console.log("result", result);
      res.json(result);
    });

    //register POST API
    app.post("/register", async (req, res) => {
      const newEventRegister = req.body;
      const result = await eventRegisterCollection.insertOne(newEventRegister);
      // console.log("newEventRegister", req.body);
      // console.log("result", result);
      res.json(result);
    });

    //register DELETE API
    app.delete("/register/:id", async (req, res) => {
      const id = req.params.id;
      // console.log("id", id)
      const query = { _id: ObjectId(id) };
      const result = await eventRegisterCollection.deleteOne(query);
      // console.log("id", result);
      res.json(result);
    });

 // events Single PUT API
 app.put("/register/:id", async (req, res) => {
  const id = req.params.id;
  const event = req.body;
  const keys = event.key;
  // console.log("event", event);
  // console.log("key", keys);
  const filter = { key :  keys};
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      title: event.title,
      desc: event.desc,
      banner: event.banner,
      date: event.date,
    },
  };
  const result = await eventRegisterCollection.updateMany(filter, updateDoc, options);
  // console.log("result", result);
  res.json(result);


  

});

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("humanity Hand Server updated");
});

app.get("/hello", (req, res) => {
  res.send("hello humanity Hand Server");
});

app.listen(port, () => {
  console.log("listing port", port);
});
