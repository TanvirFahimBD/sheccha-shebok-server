const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;
const fileUpload = require('express-fileupload')

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
    }
    catch {

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
    const paymentCollection = database.collection("payment");
    const teamMembersCollection = database.collection("teamMembers");
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

    //*********** teamMembers ************** 
    //teamMembers GET API
    app.get("/teamMembers", async (req, res) => {
      const result = await teamMembersCollection.find({}).toArray();
      res.json(result);
    });

    //teamMembers POST API
    app.post("/teamMembers", async (req, res) => {
      const index = req.body.index;
      const key = req.body.key;
      const date = req.body.date;
      const desc = req.body.desc;
      const title = req.body.title;
      const name = req.body.name;
      const email = req.body.email;
      const img = req.files.image;
      const imgData = img.data;
      const encodedImg = imgData.toString('base64')
      const imageBuffer = Buffer.from(encodedImg, 'base64')
      const bnr = req.files.banner;
      const bnrData = bnr.data;
      const encodedBnr = bnrData.toString('base64')
      const bannerBuffer = Buffer.from(encodedBnr, 'base64')
      const teamMembers = {
        index,
        key,
        date,
        desc,
        title,
        name,
        email,
        image: imageBuffer,
        banner: bannerBuffer
      }
      const result = await teamMembersCollection.insertOne(teamMembers);
      res.json(result);
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

    //users PUT API
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email }
      const options = { upsert: true }
      const updateDoc = { $set: user }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    //users -> admin PUT API
    app.put("/users/admin", verifyToken, async (req, res) => {
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          const user = req.body;
          const filter = { email: user.email }
          const updateDoc = { $set: { role: "admin" } }
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: 'you do not have access to make admin' })
      }
    });

    //users -> volunteer PUT API
    app.put("/users/volunteer", verifyToken, async (req, res) => {
      const requesterEmail = req.decodedEmail;
      if (requesterEmail) {
        const requesterAcc = await usersCollection.findOne({ email: requesterEmail });
        if (requesterAcc.role === 'admin') {
          const userNow = req.body;
          const filter = { email: userNow.email }
          const updateDoc = { $set: { role: "volunteer" } }
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: 'you do not have access to make volunteer' })
      }
    }
    );

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

    //register Single GET by email API
    app.get("/register/:email", async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const result = await eventRegisterCollection.find(query).toArray();
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
