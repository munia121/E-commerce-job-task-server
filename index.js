const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const cors = require('cors')
const port = process.env.PORT || 5000

// / middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://stunning-lebkuchen-fe383d.netlify.app'],
  credentials: true,
  optionSuccessStatus: 200,
}



app.use(cors(corsOptions))
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6irp4bx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // const productCollection = client.db('E-commerce').collection('products')

    const database = client.db("E-commerce");
    const productCollection = database.collection("products");

    app.get('/product', async (req, res) => {
      const result = await productCollection.find().toArray()
      res.send(result)
    })


    app.get('/products', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit)
        const search = req.query.search || '';


        console.log(`Search: ${search}`);
        console.log(`Page: ${page}, Limit: ${limit}`);
        const query = search ? { name: { $regex: search, $options: 'i' } } : {};
        console.log(`MongoDB Query: ${JSON.stringify(query)}`);

        const total = await productCollection.countDocuments(query);

        const startIndex = (page - 1) * limit;
        const products = await productCollection.find(query)
          .skip(startIndex)
          .limit(limit)
          .toArray();

        res.json({
          products,
          page,
          totalPages: Math.ceil(total / limit),
          totalProducts: total,
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); 
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('E-commerce server is running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})