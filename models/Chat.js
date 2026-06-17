const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, required: true }, // "user" or "model"
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Embedded chunks for semantic lookups
const DocumentChunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true } // Stores the high-dimensional vector array
});

const ChatSchema = new mongoose.Schema({
  title: { type: String, default: "New Chat Thread" },
  messages: [MessageSchema],
  documentChunks: [DocumentChunkSchema] // Holds the vector index targets for RAG lookups
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);