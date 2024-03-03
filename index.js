//importing dependencies
const cors = require("cors");
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT;

const user = encodeURIComponent(process.env.DB_USER);
const password = encodeURIComponent(process.env.DB_PASS);
const authMechanism = "DEFAULT";

//Database variables
const DB = process.env.DB;
const URI = `mongodb+srv://${user}:${password}@cluster0.82ybeuq.mongodb.net/${DB}?authMechanism=${authMechanism}`;

app.use(cors());
app.use(express.json());

const client = new MongoClient(URI);

app.get("/words", async (_, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		let response = await db.collection("words").find().toArray();
		res.json(response);
	} catch (error) {
		res.json({ message: "Error in GET", error });
	}
});

app.post("/words", async (req, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		let response = await db.collection("words").insertOne(req.body);
		res.json(response);
	} catch (error) {
		res.json({ message: "Error in POST", error });
	}
});

app.put("/words/:id", async (req, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		let update = await db
			.collection("words")
			.updateOne(
				{ id: parseInt(req.params.id) },
				{ $push: { meanings: JSON.parse(JSON.stringify(req.body)) } }
			);
		res.json(update);
	} catch (error) {
		console.log(error);
	}
});

//Listening on port
app.listen(port);