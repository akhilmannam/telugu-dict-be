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
const CLUSTER = process.env.CLUSTER;
const URI = `mongodb+srv://${user}:${password}@${CLUSTER}/${DB}?authMechanism=${authMechanism}`;

app.use(cors());
app.use(express.json());

const client = new MongoClient(URI);

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

app.post("/users", async (req, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		const { email, sub: googleId, name, picture } = req.body;
		const existingUser = await db.collection("users").findOne({ googleId });

		if (!existingUser) {
			// Insert new user
			const newUser = {
				googleId,
				email,
				name,
				picture,
				createdOn: new Date(),
				updatedOn: new Date(),
			};
			await db.collection("users").insertOne(newUser);
			res.json({ message: "User created", user: newUser });
		} else {
			res.json({ message: "User already exists", user: existingUser });
		}
	} catch (error) {
		res.json({ message: "Error in POST /users", error });
	}
});

app.post("/words", async (req, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		let response = await db.collection("words").insertOne(req.body);
		res.json(response);
	} catch (error) {
		res.json({ message: "Error in POST /words", error });
	}
});

app.put("/words/:id", async (req, res) => {
	try {
		await client.connect();
		let db = client.db(DB);
		let id = req.params.id.split("-");
		let wordId, meaningId;
		let userId = req.body.userId;

		if (id.length > 1) {
			wordId = parseInt(id[0]);
			meaningId = parseInt(id[1]);
			let interactionType = req.body.type;

			// Find the word and the specific meaning
			let word = await db
				.collection("words")
				.findOne(
					{ id: wordId, "meanings.id": meaningId },
					{ projection: { "meanings.$": 1 } }
				);

			if (!word || !word.meanings || word.meanings.length === 0) {
				return res
					.status(404)
					.json({ message: "Word or meaning not found." });
			}

			let meaning = word.meanings[0];
			let currentInteraction = meaning.interactions
				? meaning.interactions.find((i) => i.userId === userId)
				: null;

			let updateOps = {};

			if (currentInteraction) {
				// User has a previous interaction
				if (currentInteraction.type === interactionType) {
					// User is clicking the same button again, remove the interaction
					updateOps = {
						$inc: { [`meanings.$.${currentInteraction.type}`]: -1 },
						$pull: { "meanings.$.interactions": { userId } },
					};
				} else {
					// User is changing their vote
					updateOps = {
						$inc: {
							[`meanings.$.${currentInteraction.type}`]: -1,
							[`meanings.$.${interactionType}`]: 1,
						},
						$set: {
							"meanings.$.interactions.$[elem].type":
								interactionType,
						},
					};
				}
			} else {
				// New interaction
				updateOps = {
					$inc: { [`meanings.$.${interactionType}`]: 1 },
					$push: {
						"meanings.$.interactions": {
							userId,
							type: interactionType,
						},
					},
				};
			}

			let result;
			if (
				currentInteraction &&
				currentInteraction.type !== interactionType
			) {
				// Use arrayFilters only when updating an existing interaction
				result = await db
					.collection("words")
					.updateOne(
						{ id: wordId, "meanings.id": meaningId },
						updateOps,
						{ arrayFilters: [{ "elem.userId": userId }] }
					);
			} else {
				result = await db
					.collection("words")
					.updateOne(
						{ id: wordId, "meanings.id": meaningId },
						updateOps
					);
			}

			res.json(result);
		} else {
			wordId = parseInt(req.params.id);
			let update = await db
				.collection("words")
				.updateOne(
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
		console.error("Detailed error:", error);
		res.status(500).json({
			message: "Internal server error.",
			error: error.message,
		});
	} finally {
		try {
			await client.close();
		} catch (closeError) {
			console.error("Error closing database connection:", closeError);
		}
	}
});

//Listening on port
app.listen(port);
