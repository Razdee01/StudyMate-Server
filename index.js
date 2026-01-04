const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB URI with encoded credentials
const encodedUsername = encodeURIComponent(process.env.DB_USERNAME || "");
const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD || "");
const uri = `mongodb+srv://${encodedUsername}:${encodedPassword}@cluster0.xujbby0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("StudyMate Server is running!");
});

// Helper to get DB (lazy connect)
async function getDB() {
  try {
    await client.connect();
    return client.db("StudyMate");
  } catch (error) {
    console.error("DB connection error:", error);
    throw error;
  }
}

// --- ROUTES ---

app.get("/top-study-partners", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db
      .collection("partners")
      .find()
      .sort({ rating: -1 })
      .limit(3)
      .toArray();
    res.json(result);
  } catch (error) {
    res.json([]);
  }
});

app.get("/partners", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.collection("partners").find().toArray();
    res.json(result);
  } catch (error) {
    res.json([]);
  }
});

app.get("/partners/:id", async (req, res) => {
  try {
    const db = await getDB();
    const partner = await db.collection("partners").findOne({
      _id: new ObjectId(req.params.id),
    });
    res.json(partner || {});
  } catch (error) {
    res.json({});
  }
});

app.post("/partners", async (req, res) => {
  try {
    const db = await getDB();
    let data = req.body;
    const normalizedEmail = data.email.toLowerCase();

    const existing = await db.collection("partners").findOne({
      email: { $regex: new RegExp("^" + normalizedEmail + "$", "i") },
    });

    if (existing) {
      return res.json({
        success: false,
        message: "Profile already exists with this email",
      });
    }

    data.email = normalizedEmail;
    const result = await db.collection("partners").insertOne(data);

    res.json({
      success: true,
      message: "Profile created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});
// Add this to your server.js
app.patch("/update-profile", async (req, res) => {
  try {
    const db = await getDB(); // <--- Added this line to fix the crash
    const email = req.query.email;
    const updatedData = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const query = { email: email };
    const updateDoc = {
      $set: updatedData,
    };

    const result = await db.collection("partners").updateOne(query, updateDoc);
    res.send(result);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/my-profile", async (req, res) => {
  try {
    let email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email required" });

    email = email.toLowerCase();
    const db = await getDB();
    const profile = await db.collection("partners").findOne({
      email: { $regex: new RegExp("^" + email + "$", "i") },
    });

    if (!profile) {
      return res.status(404).json({ message: "No profile found" });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/requests", async (req, res) => {
  try {
    const db = await getDB();
    const data = req.body;
    if (!data.partnerId) {
      return res.status(400).json({ error: "Missing partnerId" });
    }
    const result = await db.collection("requests").insertOne(data);
    const filter = { _id: new ObjectId(data.partnerId) };
    const partner = await db.collection("partners").findOne(filter);
    let partnerCount = parseInt(partner.partnerCount) || 0;
    await db.collection("partners").updateOne(filter, {
      $set: { partnerCount: partnerCount + 1 },
    });
    res.json({ success: true, message: "Request sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/requests/sent/:email", async (req, res) => {
  try {
    const db = await getDB();
    const email = req.params.email;
    const requests = await db
      .collection("requests")
      .find({ sent_by: email })
      .toArray();
    res.json(requests);
  } catch (error) {
    res.json([]);
  }
});

app.put("/requests/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = req.params.id;
    const updatedData = req.body;
    const result = await db
      .collection("requests")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.delete("/requests/:id", async (req, res) => {
  try {
    const db = await getDB();
    const id = req.params.id;
    const result = await db.collection("requests").deleteOne({
      _id: new ObjectId(id),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = app;
