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
    const database = client.db("cardb");
    const dbCollection = database.collection("cars");
    // GET API
    app.get("/users", async (req, res) => {
      const cursor = dbCollection.find({});
      const users = await cursor.toArray();
      res.send(users);
    });

    //Single GET API
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await dbCollection.findOne(query);
      console.log("id", result);
      res.json(result);
    });

    //POST API
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await dbCollection.insertOne(newUser);
      console.log("new User", req.body);
      console.log("result", result);
      res.json(result);
    });

    //DELETE API
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await dbCollection.deleteOne(query);
      console.log("id", result);
      res.json(result);
    });

    //Single PUT API
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: req.body.name,
          partner: req.body.partner,
          img: req.body.img,
        },
      };
      const result = await dbCollection.updateOne(filter, updateDoc, options);
      console.log("id", result);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car Mac Server updated");
});

app.get("/hello", (req, res) => {
  res.send("hello Car Mac Server");
});

app.listen(port, () => {
  console.log("listing port", port);
});
