const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

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

async function run() {
  try {
    await client.connect();
    const database = client.db("humanityHand");
    const eventCollection = database.collection("events");
    const eventRegisterCollection = database.collection("eventRegister");

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
      console.log("id", result);
      res.json(result);
    });

  // events POST API
  app.post("/events", async (req, res) => {
    const newEvent = req.body;
    const result = await eventCollection.insertOne(newEvent);
    console.log("newEvent", req.body);
    console.log("result", result);
    res.json(result);
  });

    //events DELETE API
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id", id)
      const query = { _id: ObjectId(id) };
      const result = await eventCollection.deleteOne(query);
      console.log("id", result);
      res.json(result);
    });

      // events Single PUT API
      app.put("/events/:id", async (req, res) => {
        const id = req.params.id;
        const event = req.body;
        console.log("event", event);
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
        console.log("result", result);
        res.json(result);
      });

    //register Single GET API
    app.get("/register", async (req, res) => {
      const query = {};
      const result = await eventRegisterCollection.find(query).toArray();
      console.log("result", result);
      res.json(result);
    });
  
    //register Single GET by email API
    app.get("/register/:email", async (req, res) => {
      const email = req?.params?.email;
      // console.log(email);
      const query = { email: email };
      const result = await eventRegisterCollection.find(query).toArray();
      console.log("result", result);
      res.json(result);
    });

    //register POST API
    app.post("/register", async (req, res) => {
      const newEventRegister = req.body;
      const result = await eventRegisterCollection.insertOne(newEventRegister);
      console.log("newEventRegister", req.body);
      console.log("result", result);
      res.json(result);
    });

    //register DELETE API
    app.delete("/register/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id", id)
      const query = { _id: ObjectId(id) };
      const result = await eventRegisterCollection.deleteOne(query);
      console.log("id", result);
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
