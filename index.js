const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
require("dotenv").config();
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.xujbby0.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const db = client.db("StudyMate");
    const partnersCollection = db.collection("partners");
    const requestsCollection = db.collection("requests");

    app.put("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const result = await requestsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      res.json(result);
    });

    app.get("/requests/sent/:email", async (req, res) => {
      const email = req.params.email;
      const requests = await requestsCollection
        .find({ sent_by: email })
        .toArray();
      res.json(requests);
    });

    app.post("/requests", async (req, res) => {
      const data = req.body;

      if (!data.partnerId) {
        return res.status(400).json({ error: "Missing partnerId" });
      }

      const result = await requestsCollection.insertOne(data);
      const filter = { _id: new ObjectId(data.partnerId) };
      const partner = await partnersCollection.findOne(filter);
      let partnerCount = parseInt(partner.partnerCount) || 0;

      await partnersCollection.updateOne(filter, {
        $set: { partnerCount: partnerCount + 1 },
      });

      res.json({ success: true, message: "Request sent successfully" });
    });

    app.get("/top-study-partners", async (req, res) => {
      const cursor = partnersCollection
        .find({ rating: { $exists: true } })
        .sort({ rating: -1 })
        .limit(3);
      const result = await cursor.toArray();
      res.send(result);
    });

    // for details --- single data loading
    app.get("/partners/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const partner = await partnersCollection.findOne(query);
      res.send(partner);
    });

    app.get("/partners", async (req, res) => {
      const cursor = partnersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/partners", async (req, res) => {
      const data = req.body;
      const existingPartner = await partnersCollection.findOne({
        email: data.email,
      });

      if (existingPartner) {
        return res.send({
          success: false,
        });
      }
      const result = await partnersCollection.insertOne(data);

      res.send({
        success: true,
        result,
      });
    });
    // DELETE request
    app.delete("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const result = await requestsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // UPDATE request
    app.put("/requests/:id", async (req, res) => {
      const id = req.params.id;
      const updated = req.body;
      const result = await requestsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updated }
      );
      res.send(result);
    });
    // Get current user's profile by email
    app.get("/my-profile", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).json({ error: "Email required" });

      const profile = await partnersCollection.findOne({ email });
      if (!profile) {
        return res.status(404).json({ message: "No profile found" });
      }
      res.json(profile);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
