require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Section = require('./models/Sections');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token from the header

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, 'your_jwt_secret', (err, user) => { // Replace with your actual secret
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user; // Attach user information to the request
        next(); // Proceed to the next middleware or route handler
    });
};
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { // Use the environment variable
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("MongoDB connected");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

// Endpoint to fetch random questions based on selected topics
app.post('/api/questions',authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    const { selectedTopics, numberOfQuestions, timeLimit } = req.body;

    try {
        const sections = await Section.find({
            "collections.subsection": { $in: selectedTopics }
        });

        if (sections.length === 0) {
            return res.status(404).json({ error: "No sections found" });
        }

        const allQuestions = [];
        sections.forEach(section => {
            section.collections.forEach(collection => {
                if (selectedTopics.includes(collection.subsection)) {
                    allQuestions.push(...collection.questions);
                }
            });
        });

        const shuffledQuestions = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffledQuestions.slice(0, numberOfQuestions);

        res.json({ questions: selectedQuestions, timeLimit });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    const { name, email, password, course } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, course });
        await newUser.save();

        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '4h' }); // Use the environment variable

        res.json({ message: "Login successful", token });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// User endpoint
app.get('/api/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use the environment variable
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ name: user.name, email: user.email, course: user.course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.use(cors({
    origin: 'https://your-frontend-url',
    methods: ['GET', 'POST'],
    credentials: true
}));
