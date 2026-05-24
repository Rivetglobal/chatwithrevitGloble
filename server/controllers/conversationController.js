const Conversation = require('../models/Conversation');
const Chat = require('../models/Chat');

exports.createConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { title } = req.body;

    const conversation = new Conversation({
      userId,
      title: title || 'New Conversation'
    });

    await conversation.save();

    res.json({
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, skip = 0 } = req.query;

    // Main-chat list excludes project-scoped conversations (those live under
    // each project's own sidebar in /api/projects/:id/conversations).
    const mainChatFilter = { userId, $or: [{ projectId: null }, { projectId: { $exists: false } }] };

    const conversations = await Conversation.find(mainChatFilter)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const conversationIds = conversations.map((c) => c._id);
    const counts = await Chat.aggregate([
      { $match: { conversationId: { $in: conversationIds } } },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } }
    ]);
    const countMap = counts.reduce((acc, c) => {
      acc[String(c._id)] = c.count;
      return acc;
    }, {});

    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Chat.findOne({ conversationId: conv._id })
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          _id: conv._id,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          preview: lastMessage ? lastMessage.message.substring(0, 50) : '',
          messageCount: countMap[String(conv._id)] || 0
        };
      })
    );

    const total = await Conversation.countDocuments(mainChatFilter);

    res.json({
      conversations: conversationsWithPreview,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Chat.find({ conversationId })
      .sort({ timestamp: 1 });

    res.json({
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
};

exports.updateConversationTitle = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId },
      { title, updatedAt: new Date() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;

    const [totalConversations, totalMessages, latest] = await Promise.all([
      Conversation.countDocuments({ userId }),
      Chat.countDocuments({ userId }),
      Chat.findOne({ userId }).sort({ timestamp: -1 }).select('timestamp')
    ]);

    res.json({
      totalConversations,
      totalMessages,
      lastActiveAt: latest ? latest.timestamp : null
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOneAndDelete({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await Chat.deleteMany({ conversationId });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};
