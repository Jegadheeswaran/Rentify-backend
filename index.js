const express = require("express")
const cors = require("cors");
const zod = require('zod');
const jwt = require("jsonwebtoken"); 
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const { PrismaClient } = require('@prisma/client');
const { authenticationMiddleware } = require("./authenticationMiddleware");
const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

const signupBody = zod.object({
    email : zod.string().email(),
    password : zod.string(),
    number : zod.string().length(10),
    firstName : zod.string(),
    lastName : zod.string()
}
)

const propertySchema = zod.object({
    street: zod.string(),
    area: zod.string(),
    city: zod.string(),
    state: zod.string(),
    noOfBedRooms: zod.number().int(),
    noOfBathRooms: zod.number().int(),
    nearbyHospital: zod.boolean(),
    nearByCollege: zod.boolean(),
  });


app.use(cors({
    origin: "https://rentify-frontend-ecru.vercel.app",
    methods : ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

//login end point       

app.post("/signup", async (req, res) => {
    const body = req.body;
    const {success} = signupBody.safeParse(body);
    
    if (!success) {
        return res.status(411).json({
            message: "Incorrect inputs"
        });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: body.email },
                    { number: body.number }
                ]
            }
        });

        if (user) {
            return res.status(411).json({
                message: "Email/Mobile number is taken"
            });
        }

        const newUser = await prisma.user.create({
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                number: body.number,
                password: body.password
            }
        });
        
        const userId = newUser.id;

        const token = jwt.sign({
            userId
        }, JWT_SECRET);

        res.json({
            message: "User created successfully",
            token: token
        });
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({
            message: "Error processing database query"
        });
    }
});

//creating a new property 

app.post("/property",authenticationMiddleware, async (req, res) => {
    try {
      const { street, area, city, state, noOfBedRooms, noOfBathRooms, nearbyHospital, nearByCollege } = req.body;
      const {success} = propertySchema.safeParse(req.body);
      if(!success){
        return res.status(411).json({
            message: "Incorrect inputs"
        });
      }
      const newProperty = await prisma.properties.create({
        data: {
          street,
          area,
          city,
          state,
          noOfBedRooms,
          noOfBathRooms,
          nearbyHospital,
          nearByCollege,
          userId : req.userId,
        },
      });
  
      res.json({ message: "Property created successfully", property: newProperty });
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Error creating property" });
    }
  });

//updating property details

app.put("/properties/:id", authenticationMiddleware, async (req, res) => {
    const userId = req.userId; 
    const id = parseInt(req.params.id);
    const body = req.body;

    try {
        const existingProperty = await prisma.properties.findFirst({
            where: {
                id,
                userId
            }
        });

        if (!existingProperty) {
            return res.status(404).json({ message: "Property not found or does not belong to the authenticated user" });
        }
        const updatedProperty = await prisma.properties.update({
            where: { id },
            data: {
                street: body.street,
                area: body.area,
                city: body.city,
                state: body.State,
                noOfBedRooms: body.noOfBedRooms,
                noOfBathRooms: body.noOfBathRooms,
                nearbyHospital: body.nearbyHospital,
                nearByCollege: body.nearByCollege
            }
        });

        res.json({ message: "Property updated successfully", property: updatedProperty });
    } catch (error) {
        console.error("Error updating property:", error);
        res.status(500).json({ message: "Error updating property" });
    }
});

//deleting a property

app.delete("/properties/:id", authenticationMiddleware, async (req, res) => {
    const userId = req.userId; 
    const id = parseInt(req.params.id);

    try {
        const property = await prisma.properties.findFirst({
            where: {
                id,
                userId
            }
        });

        if (!property) {
            return res.status(404).json({ message: "Property not found or does not belong to the authenticated user" });
        }

        await prisma.properties.delete({ where: { id } });
        
        res.json({ message: "Property deleted successfully" });
    } catch (error) {
        console.error("Error deleting property:", error);
        res.status(500).json({ message: "Error deleting property" });
    }
});

//viewing list of property created by user

app.get("/properties",authenticationMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const properties = await prisma.properties.findMany({
            where: {
                userId: parseInt(userId)
            }
        });

        res.json(properties);
    } catch (error) {
        console.error("Error fetching properties:", error);
        res.status(500).json({ message: "Error fetching properties" });
    }
});

//viewing details of particular property

app.get("/property/:id",authenticationMiddleware, async (req, res) => {
    const propertyId = parseInt(req.params.id);

    try {
        const property = await prisma.properties.findUnique({
            where: { id: propertyId },
            include: {
                owner: true
            }
        });
        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }
        res.json(property.owner);
    } catch (error) {
        console.error("Error fetching property details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

//viewing all and filtered property

app.get('/allproperties', async (req, res) => {
    try {
        const { city, state, minBedrooms, maxBedrooms, minBathrooms, maxBathrooms } = req.query;

        const properties = await prisma.properties.findMany({
            where: {
                city: city || undefined,
                state: state || undefined,
                noOfBedRooms: {
                    gte: minBedrooms ? parseInt(minBedrooms) : undefined,
                    lte: maxBedrooms ? parseInt(maxBedrooms) : undefined
                },
                noOfBathRooms: {
                    gte: minBathrooms ? parseInt(minBathrooms) : undefined,
                    lte: maxBathrooms ? parseInt(maxBathrooms) : undefined
                }
            }
        });

        res.json(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ message: 'Error fetching properties' });
    }
});

app.listen(PORT,(err)=>{
    if(err)
        console.log(err);
    else   
        console.log("App is listening to port "+PORT);
})