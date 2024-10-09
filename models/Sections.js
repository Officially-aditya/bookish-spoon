const mongoose = require('mongoose');


const questionSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    s_id: { type: Number, required: true },
    statements: { type: [String], required: false }, // Optional for certain question types
    conclusions: { type: [String], required: false }, // Optional for certain question types
    word: { type: String, required: false } // Optional for certain question types
});


const collectionSchema = new mongoose.Schema({
    section: { type: String, required: true },
    subsection: { type: String, required: true },
    questions: { type: [questionSchema], required: true }
});


const sectionSchema = new mongoose.Schema({
    collections: [collectionSchema]
});


const Section = mongoose.model('Sections', sectionSchema);

module.exports = Section;
