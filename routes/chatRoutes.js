const express = require("express");
const router = express.Router();
const Chat = require("../models/chat"); // Adjust path to your new chat.js schema
const { GoogleGenAI } = require("@google/genai");

// Initialize the modern Google Gen AI SDK client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// =========================================================================
// 1. GENERATE RESPONSE & UPDATE HISTORY (The main engine)
// =========================================================================
router.post("/generate", async (req, res) => {
  const { message, chatId } = req.body; 

  try {
    let currentChat;
    let formattedHistory = [];

    if (chatId) {
      // CASE 1: Conversation already exists. Find it.
      currentChat = await Chat.findById(chatId);
      if (!currentChat) {
        return res.status(404).json({ error: "Active chat session not found." });
      }

      // Convert stored MongoDB data format into Gemini SDK's exact structure
      formattedHistory = currentChat.messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      // Immediately persist the user's incoming message to the DB array
      currentChat.messages.push({ role: "user", text: message });
      await currentChat.save();
    } else {
      // CASE 2: Brand new chat window. Initialize a new session.
      // Generate a dynamic title using the first 30 characters of the user prompt
      const sessionTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;

      currentChat = new Chat({
        title: sessionTitle,
        messages: [{ role: "user", text: message }],
      });
      await currentChat.save();
    }

    // Spin up an isolated multi-turn chat session inside Gemini with contextual memory
    const chatSession = ai.chats.create({
      model: "gemini-2.5-flash", // Using fast, optimized multimodal model
      history: formattedHistory,  // Reloads past exchanges (e.g., "What is water")
    });

    // Execute generation
    const result = await chatSession.sendMessage({ message: message });
    const aiResponseText = result.text;

    // Push the assistant's new response back into the MongoDB document array
    currentChat.messages.push({ role: "model", text: aiResponseText });
    await currentChat.save();

    // Send everything back to React
    res.json({
      text: aiResponseText,
      chatId: currentChat._id,
    });

  } catch (error) {
    console.error("AI Generation Matrix Error:", error);
    res.status(500).json({ error: "Failed to compile AI engine response." });
  }
});

// =========================================================================
// 2. FETCH ALL PAST SESSIONS (Populates your Sidebar Tabs lightweight)
// =========================================================================
router.get("/sessions", async (req, res) => {
  try {
    // Exclude heavy message arrays to speed up initial page loading
    const sessionsList = await Chat.find()
      .select("title updatedAt")
      .sort({ updatedAt: -1 }); // Newest/most active threads instantly hit the top
    res.json(sessionsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 3. FETCH FULL CONVERSATION (Triggered when user clicks a sidebar tab)
// =========================================================================
router.get("/sessions/:id", async (req, res) => {
  try {
    const fullChat = await Chat.findById(req.params.id);
    if (!fullChat) {
      return res.status(404).json({ message: "Requested conversation does not exist." });
    }
    res.json(fullChat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;