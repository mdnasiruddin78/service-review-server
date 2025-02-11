require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
const app = express()

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://a11-service-review.netlify.app',
        'https://service-review-server-eosin.vercel.app',
    ],
    credentials: true,
    optionalSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    if (!token) return res.status(401).send({ message: 'unauthorized access' })
    jwt.verify(token, process.env.SECRET_API_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
    })

    next()
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h3mej.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const serviceCollection = client.db("serviceDb").collection("serviceInfo");
        const reviewCollection = client.db("serviceDb").collection("reviewInfo");

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // jwt route auth related apis
        app.post('/jwt', (req, res) => {
            const email = req.body
            const token = jwt.sign(email, process.env.SECRET_API_KEY)

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })

                .send({ success: true })
        })

        // remove token apis
        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                maxAge: 0,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })

                .send({ success: true })
        })

        // all service data to database post
        app.post('/addService', async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service)
            res.send(result)
        })

        app.get('/allService', async (req, res) => {
            const filter = req.query.filter
            const search = req.query.search
            let query = {
                title: {
                    $regex: search,
                    $options: 'i'
                }
            }
            if (filter) query.category = filter
            const result = await serviceCollection.find(query).toArray();
            res.send(result)
        })

        // my service by email
        app.get('/allService/:email', verifyToken, async (req, res) => {
            const decodedEmail = req.user?.email
            const email = req.params.email
            if (decodedEmail !== email)
                return res.status(401).send({ message: 'unauthorized access' })
            const query = { email: email }
            const result = await serviceCollection.find(query).toArray()
            res.send(result)
        })

        // my service by email delete
        app.delete('/allService/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.deleteOne(query)
            res.send(result)
        })

        // get all service data
        app.get('/serviceLimit', async (req, res) => {
            const cursor = serviceCollection.find().limit(6);
            const result = await cursor.toArray();
            res.send(result)
        })

        // service details by id
        app.get('/serviceDetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query)
            res.send(result)
        })

        // update service
        app.put('/updateService/:id', async (req, res) => {
            const id = req.params.id
            const serviceUpdate = req.body
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: {
                    ...serviceUpdate,
                }
            }
            const option = { upsert: true }
            const result = await serviceCollection.updateOne(query, updated, option)
            res.send(result)
        })

        // update Review
        app.put('/reviewUpdate/:id', async (req, res) => {
            const id = req.params.id
            const reviewUpdate = req.body
            const query = { _id: new ObjectId(id) }
            const updated = {
                $set: {
                    ...reviewUpdate,
                }
            }
            const option = { upsert: true }
            const result = await reviewCollection.updateOne(query, updated, option)
            res.send(result)
        })

        // all review post 
        app.post('/allReview', async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        // // get review by category
        app.get('/allReview/:category', async (req, res) => {
            const category = req.params.category
            const query = { category: category }
            const result = await reviewCollection.find(query).toArray()
            res.send(result)
        })

        // get review by email
        app.get('/allReviews/:email', verifyToken, async (req, res) => {
            const decodedEmail = req.user?.email
            const email = req.params.email
            if (decodedEmail !== email)
                return res.status(401).send({ message: 'unauthorized access' })
            const query = { email: email }
            const result = await reviewCollection.find(query).toArray()
            res.send(result)
        })

        // delete a review
        app.delete('/deleteReview/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await reviewCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from work service Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))