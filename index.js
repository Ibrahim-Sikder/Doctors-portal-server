const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000 ;

const app = express();

// middleware 
app.use(cors());
app.use(express.json());

// database connection 



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.u82gun1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    // console.log('token inside verifyJWT', req.headers.authorization)
    const authHeader = req.headers.authorization ;
    if(!authHeader){
        return res.status(401).send('unauthorized accessed')
    }
    const token = authorized.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded ;
        next();

    })

}


async function run(){
    try{
        const appointmentOptionCollection = client.db('DoctorsPortal').collection('AppointmentOptions');
        const bookingCollections = client.db('DoctorsPortal').collection('bookings');
        const userCollections = client.db('DoctorsPortal').collection('users');


         // JWT
         app.get('/jwt', async(req, res)=>{
            const email = req.query.email ;
            const query = {email: email};
            const user =  await userCollections.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'} );
                return res.send({accessToken: token})
            }
            
            res.status(403).send({accessToken: ''})
           
         })


        // create user api 
        app.post('/users', async (req, res) =>{
            const user = req.body;
            const result = await userCollections.insertOne(user);
            res.send(result);
        })


        // booking api 
        app.get('/bookings', verifyJWT, async (req, res) =>{
            const email = req.query.email ;
            const decodedEmail = req.decoded.email;
            
            if(email !== decodedEmail){
                return res.status(403).send({message: 'forbidden access'});
            }

            const query = { email: email };
            const bookings = await bookingCollections.find(query).toArray();
            res.send(bookings)
        })

        // insert booking informations 
        app.post('/bookings', async (req, res)=>{
            const booking = req.body ;
            // console.log(booking);
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email ,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingCollections.find(query).toArray();
            if(alreadyBooked.length){
                const message = `You already have a booking on ${booking.appointmentDate}`
                return res.send({acknowledged: false, message})
            }
           


            const result = await bookingCollections.insertOne(booking);
            res.send(result);
        })

        app.get('/appointmentOptions', (async (req, res)=>{
            const date = req.query.date ;
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            const bookingQuery = {appointmentDate: date}
            const alreadyBooked = await bookingCollections.find(bookingQuery).toArray();
            options.forEach(option =>{
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot)
                const remainingSlots = option.slots.filter(slot=> !bookedSlots.includes(slot));
                option.slots = remainingSlots
                console.log(date, option.name, remainingSlots.length)
            })
            res.send(options)
        }));

       

    }
    finally{

    }

}
run().catch(console.log);



app.get('/', async (req, res)=>{
    res.send("Doctors portal server is running")
})

app.listen(port, ()=>console.log(`Doctors portal kaj kortece ${port}`))