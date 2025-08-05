require("dotenv").config(); // Load .env file
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const PORT = 5000;

// ✅ Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
	fs.mkdirSync("uploads");
}

// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// ✅ Multer setup
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads");
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname));
	},
});
const upload = multer({
	storage: storage,
	limits: { fileSize: 1024 * 1024 * 5 }, // 5MB max
});

// ✅ OpenAI setup
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// ✅ In-memory database
const database = [];

const generateID = () => Math.random().toString(36).substring(2, 10);

// ✅ Function to get ChatGPT response
const ChatGPTFunction = async (text) => {
	const response = await openai.chat.completions.create({
		model: "gpt-3.5-turbo",
		messages: [{ role: "user", content: text }],
		temperature: 0.6,
	});
	return response.choices[0].message.content;
};

// ✅ Main route to handle resume form submission
app.post("/resume/create", upload.single("headshotImage"), async (req, res) => {
	try {
		const {
			fullName,
			currentPosition,
			currentLength,
			currentTechnologies,
			workHistory,
		} = req.body;

		const workArray = JSON.parse(workHistory);
		const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

		const newEntry = {
			id: generateID(),
			fullName,
			image_url: imageUrl,
			currentPosition,
			currentLength,
			currentTechnologies,
			workHistory: workArray,
		};

		// Prompts
		const prompt1 = `I am writing a resume. My name is ${fullName}, I work as a ${currentPosition} with ${currentLength} years of experience. I work with technologies like ${currentTechnologies}. Write a 100-word summary about me in first person.`;
		const prompt2 = `Give 10 strong bullet points for my resume based on this: I am ${fullName}, working as a ${currentPosition} for ${currentLength} years using ${currentTechnologies}.`;
		const prompt3 = `I worked at ${workArray.length} companies: ${workArray
			.map((c) => `${c.name} as ${c.position}`)
			.join(", ")}. Write ~50 words for each company in first person, describing my success at each.`;

		const objective = "I'm a passionate developer with strong experience in modern tech.";
		const keypoints = "- Built scalable web apps\n- Collaborated with cross-functional teams\n- Led deployments";
		const jobResponsibilities = "At XYZ Corp, I improved performance by 40%. At ABC Inc, I mentored 3 junior devs.";


		const chatgptData = { objective, keypoints, jobResponsibilities };
		const data = { ...newEntry, ...chatgptData };

		database.push(data);

		res.json({
			message: "Resume created successfully!",
			data,
		});
	} catch (err) {
		console.error("Error:", err);
		res.status(500).json({ message: "Server Error", error: err.message });
	}
});

// ✅ Optional: Simple GET route to test server
app.get("/", (req, res) => {
	res.send("Resume Builder API is running 🚀");
});

app.listen(PORT, () => {
	console.log(`✅ Server is running at http://localhost:${PORT}`);
});
