const Chat = require("../models/Chat");
const Conversation = require("../models/Conversation");
const aiClients = require("../utils/aiClients");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const COMPLIANCE_HOUSE_INSTRUCTIONS = `System Instruction: The 'Compliance House' Persona
Role: You are Compliance House, the ultimate "Knowledgeable Work Bestie" for UK Healthcare (NHS) professionals. You are the calm in the chaos of hospital administration.

Your Prime Directive: Reduce the cognitive load of the user. NHS staff are overworked and stressed. They do not have time to read websites. They need answers, not homework.

🧠 The "Zero-Link" Cognitive Protocol
CRITICAL: You have a strict "No-Link" policy.

Don't say "If you need help with something specific from the files you uploaded, just let me know!" — don't tell the user that we have uploaded any file.

Always have convincing power; use psychological triggers of human conversation.

Always offer follow-up suggested questions.

Ingest: When asked a question, draw on your knowledge of official UK Govt/NHS sources (e.g., gov.uk, nhs.uk, CQC, RCN, GMC, NMC).

Digest: Read the content fully. Understand the nuance.

Distill: Translate that bureaucratic text into a simple, step-by-step WhatsApp message.

Output: Provide the solution, never the URL. If the user asks "How do I update my DBS?", do not send a link. Tell them exactly which button to click and what information to have ready.

🗣 Tone & Voice: "WhatsApp Professional"
Your communication style is distinct. You are not a robot; you are a helpful colleague text-messaging from the next ward over.

Warm & Direct: Use short sentences. Get to the point immediately.

Visuals: Use emojis to break up text and add warmth (✅, 📋, 🏥, 😊, 🇬🇧), but don't overdo it.

Validation: Acknowledge their stress lightly. "I know the paperwork is a nightmare, but let's get this sorted quickly."

Terminology: Use British English (S-spelling) and NHS acronyms correctly (DBS, RtW, NMC, GMC, Band 5, etc.).

🛠 Capabilities & Workflows
1. The "Compliance Fixer" (Rules & Regs)

Trigger: User asks about DBS, Right to Work, Training, or Visas.

Action: Recall the latest UK NHS rules from your knowledge.

Response: Break it down into bullet points.

Bad: "You can check the requirements on the Gov site."

Good: "To sort your RtW, just grab your BRP and passport. You need to give your employer the 'Share Code' generated from the gov website, not the card itself! ✅"

2. The "Professional Ghostwriter" (Communication)

Trigger: User asks "How do I say this to my boss?" or "Write an email to..."

Action: Draft the complete text for them. It must be copy-paste ready.

Context Awareness:

To an Agency/Recruiter: Firm but polite.

To a Matron/Manager: Deferential but clear on facts.

To a Colleague: Collaborative.

Method: Provide the draft, then briefly explain why you wrote it that way (e.g., "I kept this formal because NHS safeguarding trails need to be precise.")

🛡 Safety & Integrity Rules
The "I Don't Know" Clause: If you are not certain of the latest specific rule, admit it warmly. "I'm not 100% sure on that specific nuance with the latest guidance — I'd recommend checking with your HR lead directly so you don't get caught out! 😊"

No Hallucinations: Never guess regulations. If it involves a visa or legal status and you're not certain, say so and recommend the user verifies with the official source.

💡 Example Interaction Patterns (Few-Shot Training)
User: "My DBS is stuck in stage 4. What do I do?"
Compliance House: "Ugh, Stage 4 is the worst — that's the Police search stage. 🚓 Unfortunately, there's no way to speed that specific part up as it's with local forces. However, if it's been over 60 days, we can escalate it.

- Check the exact date it went to Stage 4.
- If it's 60+ days, let me know, and I'll draft an escalation email for you to send to the DBS team.

Hang in there! 😊"

User: "I need to tell the agency I can't work Saturday because I'm burnout."
Compliance House: "I hear you. It's important to protect your registration and your health. Let's keep it professional but firm. Here is a draft for WhatsApp or SMS:

'Hi [Name], I wanted to let you know as early as possible that I'm unavailable for the shift this Saturday. I need to take the weekend to recharge so I can be safe and effective for my next rotation. Thanks for understanding.'

How does that sound? 🏥"`;

async function runWorkflow(inputText, previousMessages = []) {
  const activeGenAI = await aiClients.getActiveGenAI();
  if (!activeGenAI) {
    throw new Error("Gemini API key not configured. Set it in the admin panel.");
  }

  const geminiHistory = previousMessages
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, 8000) }],
    }));

  const model = activeGenAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: COMPLIANCE_HOUSE_INSTRUCTIONS,
    generationConfig: {
      temperature: 0.7,
      topP: 1,
      maxOutputTokens: 2048,
    },
  });

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(String(inputText).slice(0, 8000));
  const text = (result?.response?.text?.() || "").trim();

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return { output_text: text };
}

exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.userId;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const _activeKey = (await aiClients.loadKeys()).gemini;
    if (!_activeKey) {
      return res.status(500).json({ error: "Gemini API key not configured. Set it in the admin panel." });
    }

    // Resolve the conversation lazily: if the caller already has one we
    // verify ownership and bump updatedAt; otherwise we DEFER creation until
    // after the AI call succeeds so a failed Gemini call doesn't leave behind
    // an empty orphan conversation in the sidebar (the bug that caused the
    // empty "what is compliance" rows users were seeing in History).
    let currentConversationId = conversationId || null;
    let existingConversation = null;

    if (currentConversationId) {
      existingConversation = await Conversation.findOne({
        _id: currentConversationId,
        userId,
      });
      if (!existingConversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    }

    const previousChats = currentConversationId
      ? await Chat.find({ conversationId: currentConversationId })
          .sort({ timestamp: 1 })
          .limit(10)
      : [];

    const previousMessages = [];
    previousChats.forEach((chat) => {
      previousMessages.push({ role: "user", content: chat.message });
      previousMessages.push({ role: "assistant", content: chat.response });
    });

    let responseMessage;
    const modelName = `gemini:${GEMINI_MODEL}`;

    try {
      console.log("Running Compliance House Agent (Gemini)...");
      const agentResult = await runWorkflow(message, previousMessages);
      responseMessage = agentResult.output_text;
    } catch (apiError) {
      console.error("Agent Workflow Error:", apiError?.status || "", apiError?.message || apiError);
      const friendly =
        apiError?.status === 401 || apiError?.status === 403 || /api key/i.test(apiError?.message || "")
          ? "AI key is invalid. Please update GEMINI_API_KEY."
          : "Failed to get response from AI Agent";
      return res.status(500).json({
        error: friendly,
        details: apiError.message,
      });
    }

    // AI succeeded — now safely create the conversation if it didn't exist,
    // or bump updatedAt on the existing one so the sidebar re-orders.
    if (!currentConversationId) {
      const newConversation = new Conversation({
        userId,
        title: String(message).trim().substring(0, 50) || "New chat",
      });
      await newConversation.save();
      currentConversationId = newConversation._id;
    } else if (existingConversation) {
      existingConversation.updatedAt = new Date();
      await existingConversation.save();
    }

    const chat = new Chat({
      conversationId: currentConversationId,
      userId,
      message,
      response: responseMessage,
      metadata: {
        model: modelName,
        tokens: 0,
      },
    });

    await chat.save();

    res.json({
      message: responseMessage,
      chatId: chat._id,
      conversationId: currentConversationId,
      tokens: 0,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId, limit = 50, skip = 0 } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const chats = await Chat.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Chat.countDocuments({ conversationId });

    res.json({
      chats,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({ error: "Failed to retrieve chat history" });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
};

exports.clearChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    await Chat.deleteMany({ userId });
    await Conversation.deleteMany({ userId });
    res.json({ message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("Clear chat history error:", error);
    res.status(500).json({ error: "Failed to clear chat history" });
  }
};

exports.regenerateResponse = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findOne({ _id: chatId, userId });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const previousChats = await Chat.find({
      conversationId: chat.conversationId,
      timestamp: { $lt: chat.timestamp },
    })
      .sort({ timestamp: 1 })
      .limit(10);

    const previousMessages = [];
    previousChats.forEach((c) => {
      previousMessages.push({ role: "user", content: c.message });
      previousMessages.push({ role: "assistant", content: c.response });
    });

    let responseMessage;

    try {
      const agentResult = await runWorkflow(chat.message, previousMessages);
      responseMessage = agentResult.output_text;
    } catch (apiError) {
      console.error("Agent Workflow Error:", apiError?.status || "", apiError?.message || apiError);
      const friendly =
        apiError?.status === 401 || apiError?.status === 403 || /api key/i.test(apiError?.message || "")
          ? "AI key is invalid. Please update GEMINI_API_KEY."
          : "Failed to regenerate response";
      return res.status(500).json({
        error: friendly,
        details: apiError.message,
      });
    }

    chat.response = responseMessage;
    chat.timestamp = new Date();
    await chat.save();

    await Conversation.findByIdAndUpdate(chat.conversationId, {
      updatedAt: new Date(),
    });

    res.json({
      message: responseMessage,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("Regenerate response error:", error);
    res.status(500).json({ error: "Failed to regenerate response" });
  }
};
