const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const cors = require('cors')
const port = process.env.PORT || 5000

// / middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174','https://phenomenal-starship-c10cec.netlify.app' ],
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


    // *************************

    app.get('/brands', async (req, res) => {
      try {
        const brands = await productCollection.aggregate([
          { $group: { _id: "$brand" } },  // Group by brand
          { $sort: { _id: 1 } }  // Optional: sort by brand name
        ]).toArray();

        // Map the result to get an array of brand names
        const brandList = brands.map(b => b._id);

        res.json(brandList);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    // Fetch unique categories
    // app.get('/categories', async (req, res) => {
    //   try {
    //     const categories = await productCollection.findOne('category');
    //     console.log('category',categories)
    //     res.json(categories);
    //   } catch (err) {
    //     res.status(500).json({ message: err.message });
    //   }
    // });



    app.get('/categories', async (req, res) => {
      try {
        // Aggregate pipeline to get unique categories
        const categories = await productCollection.aggregate([
          {
            $group: {
              _id: null, // Group all documents together
              categories: { $addToSet: "$category" } // Collect unique categories
            }
          },
          {
            $project: {
              _id: 0, // Exclude the _id field from the output
              categories: 1 // Include the categories field
            }
          }
        ]).toArray();

        // Return categories array
        res.json(categories[0] ? categories[0].categories : []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // *************************


    // price range
    app.get('/price-range', async (req, res) => {
      try {
        const minPrice = await productCollection.find().sort({ price: 1 }).limit(1).next();
        const maxPrice = await productCollection.find().sort({ price: -1 }).limit(1).next();

        if (minPrice && maxPrice) {
          res.json({ minPrice: minPrice.price, maxPrice: maxPrice.price });
        } else {
          res.status(404).json({ message: 'No products found' });
        }
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });


    // brand
    app.get('/brands', async (req, res) => {
      try {
        // Fetch distinct brands from the product collection
        const brands = await productCollection.distinct('brand');

        // Send the list of brands as a response
        res.json(brands);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });







    app.get('/products', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit)
        const search = req.query.search || '';
        const sortField = req.query.sort || 'created_at'; // Default sort field
        const sortOrder = req.query.order === 'desc' ? -1 : 1; // Default sort order is ascending

        const brand = req.query.brand || '';
        const category = req.query.category || '';
        const priceRange = req.query.priceRange || '';

        // Parsing price range
        let minPrice = 0;
        let maxPrice = Infinity;

        if (priceRange) {
          const [min, max] = priceRange.split('-').map(Number);
          minPrice = min || 0;
          maxPrice = max || Infinity;
        }



        console.log(`Search: ${search}`);
        console.log(`Page: ${page}, Limit: ${limit}`);
        const query = {
          ...(search && { name: { $regex: search, $options: 'i' } }),
          ...(brand && { brand }),
          ...(category && { category }),
          ...(priceRange && { price: { $gte: minPrice, $lte: maxPrice } })
        };
        console.log(`MongoDB Query: ${JSON.stringify(query)}`);

        const total = await productCollection.countDocuments(query);

        const startIndex = (page - 1) * limit;
        const products = await productCollection.find(query)
          .sort({ [sortField]: sortOrder }) // Sorting logic
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