// Messages routes - API for messaging between students and teachers
const express = require('express');
const router = express.Router();
const database = require('../config/database');
const chatbot = require('../services/chatbot');
const jwt = require('jsonwebtoken');

// Middleware to check authentication (supports both JWT and session)
const requireAuth = async (req, res, next) => {
    try {
        // Check JWT token first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // Get user from database
            const result = await database.query(
                'SELECT user_id, username, email, first_name, last_name, role FROM Users WHERE user_id = @userId AND status = \'active\'',
                { userId: decoded.userId }
            );
            
            if (result.recordset.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            // Set user in request for compatibility
            req.session = req.session || {};
            req.session.user = result.recordset[0];
            return next();
        }
        
        // Fall back to session-based auth
        if (req.session && req.session.user) {
            return next();
        }
        
        return res.status(401).json({ error: 'Unauthorized - No valid token or session' });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all conversations for the current user
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        
        const query = `
            SELECT 
                c.conversation_id,
                c.title,
                c.created_by,
                c.created_at,
                c.updated_at,
                c.is_archived,
                cp.last_read_at,
                (
                    SELECT COUNT(*)
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.sent_at > ISNULL(cp.last_read_at, '1900-01-01')
                    AND m.sender_id != @userId
                    AND m.is_deleted = 0
                ) AS unread_count,
                (
                    SELECT TOP 1 content
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                    ORDER BY m.sent_at DESC
                ) AS last_message,
                (
                    SELECT TOP 1 sent_at
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                    ORDER BY m.sent_at DESC
                ) AS last_message_time,
                -- Get other participants info
                (
                    SELECT STRING_AGG(
                        CONCAT(u.first_name, ' ', u.last_name, ':', u.role), ','
                    )
                    FROM ConversationParticipants cp2
                    JOIN Users u ON cp2.user_id = u.user_id
                    WHERE cp2.conversation_id = c.conversation_id
                    AND cp2.user_id != @userId
                ) AS other_participants
            FROM Conversations c
            JOIN ConversationParticipants cp ON c.conversation_id = cp.conversation_id
            WHERE cp.user_id = @userId
            AND c.is_archived = 0
            ORDER BY last_message_time DESC
        `;
        
        const result = await database.query(query, { userId });
        
        // Parse other_participants string into array
        const conversations = result.recordset.map(conv => ({
            ...conv,
            other_participants: conv.other_participants 
                ? conv.other_participants.split(',').map(p => {
                    const [name, role] = p.split(':');
                    return { name, role };
                })
                : []
        }));
        
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const conversationId = parseInt(req.params.conversationId);
        
        // Verify user is participant
        const verifyQuery = `
            SELECT 1 FROM ConversationParticipants
            WHERE conversation_id = @conversationId
            AND user_id = @userId
        `;
        const verifyResult = await database.query(verifyQuery, { conversationId, userId });
        
        if (!verifyResult.recordset || verifyResult.recordset.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get messages
        const query = `
            SELECT 
                m.message_id,
                m.conversation_id,
                m.sender_id,
                m.content,
                m.sent_at,
                m.is_deleted,
                ISNULL(u.first_name, 'Chatbot') AS first_name,
                ISNULL(u.last_name, 'Hỗ trợ tự động') AS last_name,
                ISNULL(u.role, 'system') AS role
            FROM Messages m
            LEFT JOIN Users u ON m.sender_id = u.user_id
            WHERE m.conversation_id = @conversationId
            AND m.is_deleted = 0
            ORDER BY m.sent_at ASC
        `;
        
        const result = await database.query(query, { conversationId });
        
        const messages = result.recordset.map(msg => ({
            ...msg,
            sender_name: `${msg.first_name} ${msg.last_name}`
        }));
        
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Create a new conversation
router.post('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { participantIds, title } = req.body;
        
        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return res.status(400).json({ error: 'Participant IDs required' });
        }
        
        // Start transaction
        const query = `
            BEGIN TRANSACTION;
            
            -- Create conversation
            INSERT INTO Conversations (title, created_by, created_at, updated_at, is_archived)
            VALUES (@title, @userId, GETDATE(), GETDATE(), 0);
            
            DECLARE @conversationId INT = SCOPE_IDENTITY();
            
            -- Add creator as participant
            INSERT INTO ConversationParticipants (conversation_id, user_id, joined_at)
            VALUES (@conversationId, @userId, GETDATE());
            
            ${participantIds.map((_, index) => `
            -- Add participant ${index + 1}
            INSERT INTO ConversationParticipants (conversation_id, user_id, joined_at)
            VALUES (@conversationId, @participantId${index}, GETDATE());
            `).join('\n')}
            
            COMMIT TRANSACTION;
            
            SELECT @conversationId AS conversation_id;
        `;
        
        const params = {
            userId,
            title: title || null
        };
        
        // Add participant IDs to params
        participantIds.forEach((id, index) => {
            params[`participantId${index}`] = parseInt(id);
        });
        
        const result = await database.query(query, params);
        
        const conversationId = result.recordset[0].conversation_id;
        
        res.json({ 
            success: true, 
            conversation_id: conversationId 
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// Send a message in a conversation
router.post('/conversations/:conversationId/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const conversationId = parseInt(req.params.conversationId);
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content required' });
        }
        
        // Verify user is participant
        const verifyQuery = `
            SELECT 1 FROM ConversationParticipants
            WHERE conversation_id = @conversationId
            AND user_id = @userId
        `;
        const verifyResult = await database.query(verifyQuery, { conversationId, userId });
        
        if (!verifyResult.recordset || verifyResult.recordset.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Insert message
        const query = `
            BEGIN TRANSACTION;
            
            -- Insert message
            INSERT INTO Messages (conversation_id, sender_id, content, sent_at, is_deleted)
            VALUES (@conversationId, @userId, @content, GETDATE(), 0);
            
            DECLARE @messageId INT = SCOPE_IDENTITY();
            
            -- Update conversation updated_at
            UPDATE Conversations
            SET updated_at = GETDATE()
            WHERE conversation_id = @conversationId;
            
            COMMIT TRANSACTION;
            
            -- Return the new message with sender info
            SELECT 
                m.message_id,
                m.conversation_id,
                m.sender_id,
                m.content,
                m.sent_at,
                ISNULL(u.first_name, 'User') AS first_name,
                ISNULL(u.last_name, '') AS last_name,
                ISNULL(u.role, 'user') AS role
            FROM Messages m
            LEFT JOIN Users u ON m.sender_id = u.user_id
            WHERE m.message_id = @messageId;
        `;
        
        const result = await database.query(query, { 
            conversationId, 
            userId, 
            content: content.trim() 
        });
        
        const message = result.recordset[0];
        message.sender_name = `${message.first_name} ${message.last_name}`;
        
        // Trigger chatbot auto-response for all users in conversations with chatbot (user_id = 0)
        // Check if chatbot is a participant in this conversation
        const chatbotCheck = await database.query(
            'SELECT 1 FROM ConversationParticipants WHERE conversation_id = @conversationId AND user_id = 0',
            { conversationId }
        );
        
        if (chatbotCheck.recordset && chatbotCheck.recordset.length > 0) {
            // This conversation includes chatbot, so trigger auto-response
            const userRole = req.session.user.role;
            chatbot.processMessage(conversationId, 0, content.trim(), userRole)
                .then(response => {
                    if (response.sent) {
                        console.log(`🤖 Chatbot auto-responded in conversation ${conversationId} (type: ${response.type})`);
                    }
                })
                .catch(err => console.error('Chatbot error:', err));
        }
        
        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark messages as read
router.put('/conversations/:conversationId/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const conversationId = parseInt(req.params.conversationId);
        
        const query = `
            UPDATE ConversationParticipants
            SET last_read_at = GETDATE()
            WHERE conversation_id = @conversationId
            AND user_id = @userId
        `;
        
        await database.query(query, { conversationId, userId });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Get unread message count
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        
        const query = `
            SELECT COUNT(*) AS unread_count
            FROM Messages m
            JOIN ConversationParticipants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = @userId
            AND m.sender_id != @userId
            AND m.is_deleted = 0
            AND m.sent_at > ISNULL(cp.last_read_at, '1900-01-01')
        `;
        
        const result = await database.query(query, { userId });
        
        res.json({ count: result.recordset[0].unread_count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// Search users (for creating conversations)
router.get('/users/search', requireAuth, async (req, res) => {
    try {
        const { query: searchQuery, role } = req.query;
        const userId = req.session.user.user_id;
        
        let query = `
            SELECT 
                user_id,
                username,
                first_name,
                last_name,
                email,
                role
            FROM Users
            WHERE user_id != @userId
        `;
        
        const params = { userId };
        
        if (role) {
            query += ' AND role = @role';
            params.role = role;
        }
        
        if (searchQuery && searchQuery.trim()) {
            query += ` AND (
                first_name LIKE @search OR 
                last_name LIKE @search OR 
                username LIKE @search OR 
                email LIKE @search
            )`;
            params.search = `%${searchQuery.trim()}%`;
        }
        
        query += ' ORDER BY first_name, last_name';
        
        const result = await database.query(query, params);
        
        const users = result.recordset.map(user => ({
            ...user,
            full_name: `${user.first_name} ${user.last_name}`
        }));
        
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Get suggested replies for a message (for teachers)
router.post('/chatbot/suggestions', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }
        
        const suggestions = chatbot.getSuggestedReplies(message);
        
        res.json({ suggestions });
    } catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// Get FAQ suggestions for a message
router.post('/chatbot/faq', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }
        
        const faqs = chatbot.getFAQSuggestions(message);
        
        res.json({ faqs });
    } catch (error) {
        console.error('Error getting FAQ:', error);
        res.status(500).json({ error: 'Failed to get FAQ' });
    }
});

// Get all FAQ items
router.get('/chatbot/faq-list', requireAuth, async (req, res) => {
    try {
        const faqList = chatbot.FAQ_DATABASE.map(faq => ({
            category: faq.category,
            question: faq.question,
            answer: faq.answer
        }));
        
        res.json({ faqs: faqList });
    } catch (error) {
        console.error('Error getting FAQ list:', error);
        res.status(500).json({ error: 'Failed to get FAQ list' });
    }
});

// Check if currently outside working hours
router.get('/chatbot/working-hours', requireAuth, async (req, res) => {
    try {
        const isOutside = chatbot.isOutsideWorkingHours();
        
        res.json({ 
            outside_working_hours: isOutside,
            current_time: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error checking working hours:', error);
        res.status(500).json({ error: 'Failed to check working hours' });
    }
});

module.exports = router;
