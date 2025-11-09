const express = require("express");
const cors=require("cors")
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT ||3000;

app.use(cors())
app.use(express.json())

const uri =
  "mongodb+srv://StudyMate:u65A3lIrEnRsaPge@cluster0.xujbby0.mongodb.net/?appName=Cluster0";

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
    await client.connect();
    // Send a ping to confirm a successful connection
    const db = client.db("StudyMate");
    const partnersCollection = db.collection("partners");
    app.post("/partners", async (req, res) => {
      const partner = req.body;
      console.log(partner);
      const result = await partnersCollection.insertOne(partner);
      res.send(result);
    });
    app.get("/top-study-partners", async (req, res) => {
      const cursor=partnersCollection.find().sort({rating:-1}).limit(3);
      const result=await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
