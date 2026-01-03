const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection Setup
const encodedUsername = encodeURIComponent(process.env.DB_USERNAME);
const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
const uri = `mongodb+srv://${encodedUsername}:${encodedPassword}@cluster0.xujbby0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Global collection variables
let partnersCollection;
let requestsCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("StudyMate");
    partnersCollection = db.collection("partners");
    requestsCollection = db.collection("requests");
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

// Initialize connection
connectDB();

// Middleware to prevent errors if DB isn't connected yet
// app.use((req, res, next) => {
//   if (!partnersCollection || !requestsCollection) {
//     return res
//       .status(503)
//       .json({ error: "Database connecting... please try again in a moment." });
//   }
//   next();
// });

// --- ROUTES ---

app.get("/", (req, res) => {
  res.send("StudyMate Server is running!");
});
app.get("/top-study-partners", async (req, res) => {
  try {
    const cursor = partnersCollection
      .find() // show all partners
      .sort({ partnerCount: -1 }) // sort by most popular (or _id: -1 for newest)
      .limit(3);
    const result = await cursor.toArray();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/partners", async (req, res) => {
  try {
    const cursor = partnersCollection.find();
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/partners/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const partner = await partnersCollection.findOne(query);
    res.send(partner);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/partners", async (req, res) => {
  try {
    let data = req.body;
    const normalizedEmail = data.email.toLowerCase();

    const existing = await partnersCollection.findOne({
      email: { $regex: new RegExp("^" + normalizedEmail + "$", "i") },
    });

    if (existing) {
      return res.json({
        success: false,
        message: "Profile already exists with this email",
      });
    }

    data.email = normalizedEmail;
    const result = await partnersCollection.insertOne(data);

    res.json({
      success: true,
      message: "Profile created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/my-profile", async (req, res) => {
  try {
    let email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email required" });

    email = email.toLowerCase();
    const profile = await partnersCollection.findOne({
      email: { $regex: new RegExp("^" + email + "$", "i") },
    });

    if (!profile) {
      return res.status(404).json({ message: "No profile found" });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).send(error);
  }
});

// --- REQUESTS ROUTES ---

app.post("/requests", async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/requests/sent/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const requests = await requestsCollection
      .find({ sent_by: email })
      .toArray();
    res.json(requests);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put("/requests/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;
    const result = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.json(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete("/requests/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await requestsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Start Server locally
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// EXPORT FOR VERCEL
module.exports = app;
