const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require("firebase-admin");
const fileUpload = require('express-fileupload')
const stripe = require("stripe")('sk_test_51L6u7WFgsutIdwUumMVOPUwYY59uIRyXwS3QKLg7Prb1oG5X7FLsGcfXBAXYcgdCcHIAXvozu7WSWWcAZjCgtEXa00ORWdF8pa')

const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload())

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hqjnl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function verifyToken(req, res, next) {
  if (req?.headers?.authorization?.startsWith('Bearer ')) {
    const token = req?.headers?.authorization?.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token)
      req.decodedEmail = decodedUser.email;
      next();
    }
    catch {
      res.status(401).send({ message: 'Unauthorized' })
    }
  }
}

async function run() {
  try {
    await client.connect();
    const database = client.db("humanityHand");
    const eventCollection = database.collection("events");
    const eventRegisterCollection = database.collection("eventRegister");
    const usersCollection = database.collection("users");
    const paymentCollection = database.collection("payment");
    const reviewCollection = database.collection("reviews");
    const noticeCollection = database.collection("notices");

    //*********** notices ************** 
    //notices POST API
    app.post("/notices", async (req, res) => {
      const newNotice = req.body;
      const result = await noticeCollection.insertOne(newNotice);
      res.json(result);
    });

    //notices GET API
    app.get("/notices", async (req, res) => {
      const result = await noticeCollection.find({}).toArray();
      res.json(result);
    });

    //*********** review ************** 
    //review POST API
    app.post("/review", async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.json(result);
    });

    //review GET API
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.json(result);
    });

    //review single GET API
    app.get("/review/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    //*********** payment ************** 
    //payment POST API
    app.post("/payment", async (req, res) => {
      const newPayment = req.body;
      const result = await paymentCollection.insertOne(newPayment);
      res.json(result);
    });

    //payment GET API
    app.get("/payment/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    //payment GET API
    app.get("/payment", async (req, res) => {
      const result = await paymentCollection.find({}).toArray();
      res.send(result);
    });

    //payment POST API
    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
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

    //*********** users ************** 
    //users POST API
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.json(result);
    });

    //users get API
    app.get("/users", async (req, res) => {
      const result = await usersCollection?.find({})?.toArray();
      res.send(result);
    });

    //users get single API
    app.get("/users/account/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // users single GET API
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      let isAdmin = false
      let isVolunteer = false
      if (user?.role === 'admin') {
        isAdmin = true
      }
      if (user?.role === 'volunteer') {
        isVolunteer = true
      }
      res.json([{ admin: isAdmin }, { volunteer: isVolunteer }]);
    });

    //users PUT API
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email }
      const options = { upsert: true }
      const updateDoc = { $set: user }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    //users -> role PUT API
    app.put("/users/role", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          const options = { upsert: false }
          const filter = { email: user.email }
          const updateDoc = { $set: { role: user.role } }
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.json(result);
        }
      }
      else {
        res.status(401).json({ message: 'Unauthorized access' })
      }
    });

    //users delete API
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.json(result);
    });

    //*********** events ************** 
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
      res.json(result);
    });

    // events POST API
    app.post("/events", async (req, res) => {
      const newEvent = req.body;
      const result = await eventCollection.insertOne(newEvent);
      res.json(result);
    });

    //events DELETE API
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await eventCollection.deleteOne(query);
      res.json(result);
    });

    // events Single PUT API
    app.put("/events/:id", async (req, res) => {
      const id = req.params.id;
      const event = req.body;
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
      res.json(result);
    });

    //*********** register ************** 
    //register GET API
    app.get("/register", verifyToken, async (req, res) => {
      const query = {};
      const result = await eventRegisterCollection.find(query).toArray();
      res.json(result);
    });

    //register Single GET by id API
    app.get("/register/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await eventRegisterCollection.findOne(query);
      res.json(result);
    });

    //register Single GET by email API
    app.get("/register/event/:email", async (req, res) => {
      const email = req.params.email;
      const result = await eventRegisterCollection.find({ email: email }).toArray();
      res.json(result);
    });

    //register DELETE API
    app.delete("/register/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await eventRegisterCollection.deleteOne(query);
      res.json(result);
    });

    //register POST API
    app.post("/register", async (req, res) => {
      const newRegister = req.body;
      const result = await eventRegisterCollection.insertOne(newRegister);
      res.json(result);
    });

    // register Single PUT API
    app.put("/register/:id", async (req, res) => {
      const id = req.params.id;
      const event = req.body;
      const keys = event.key;
      const filter = { key: keys };
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

app.listen(port, () => {
  console.log("listing port", port);
});
