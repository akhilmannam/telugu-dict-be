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

app.get('/', (req, res) => {
  res.send('Hello APIs')
})

app.get("/words", async (_, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		let response = await db
			.collection("words")
			.find({}, { projection: { _id: 0 } })
			.toArray();
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
		let id = req.params.id.split("-");
		let wordId;
		let meaningId;
		if (id.length > 1) {
			wordId = parseInt(id[0]);
			meaningId = parseInt(id[1]);
			let updateField = {};
			updateField[`meanings.$.${req.body.type}`] = 1;
			let updateInteraction = await db.collection("words").updateOne(
				{
					id: wordId,
					"meanings.id": { $eq: meaningId },
				},
				{
					$inc: updateField,
				}
			);
			res.json(updateInteraction);
		} else {
			wordId = parseInt(req.params.id);
			let update = await db.collection("words").updateOne(
				{ id: wordId },
				{
					$push: {
						meanings: JSON.parse(JSON.stringify(req.body)),
					},
				}
			);
			res.json(update);
		}
	} catch (error) {
		console.log(error);
	}
});

//Listening on port
app.listen(port);
