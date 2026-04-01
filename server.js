/* ========================================== */
/* PRICONNECTE MESSENGER - BACKEND            */
/* ========================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// База данных в памяти
const db = {
    users: new Map(),
    sessions: new Map(),
    messages: new Map(),
    chats: new Map()
};

// Сохранение данных
function saveData() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(Array.from(db.users.entries())));
    fs.writeFileSync(path.join(dataDir, 'messages.json'), JSON.stringify(Array.from(db.messages.entries())));
    fs.writeFileSync(path.join(dataDir, 'chats.json'), JSON.stringify(Array.from(db.chats.entries())));
}

function loadData() {
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
        try {
            db.users = new Map(JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8')));
            db.messages = new Map(JSON.parse(fs.readFileSync(path.join(dataDir, 'messages.json'), 'utf8')));
            db.chats = new Map(JSON.parse(fs.readFileSync(path.join(dataDir, 'chats.json'), 'utf8')));
            console.log('✅ Данные загружены');
        } catch (error) {
            console.log('⚠️ Создаём новую базу данных');
        }
    }
}

loadData();

// API: Создание пользователя (авто)
app.post('/api/user/create', (req, res) => {
    try {
        const { name } = req.body;
        const userId = uuidv4();
        
        const user = {
            id: userId,
            name: name || 'Гость ' + Math.floor(Math.random() * 1000),
            username: '@user' + Math.floor(Math.random() * 10000),
            bio: '',
            avatar: null,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            settings: {
                theme: 'light',
                notifications: true
            },
            privacy: {
                online: 'everyone',
                photo: 'everyone',
                lastSeen: 'everyone'
            }
        };
        
        db.users.set(userId, user);
        saveData();
        
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Обновление профиля
app.put('/api/user/profile/:userId', (req, res) => {
    try {
        const user = db.users.get(req.params.userId);
        if (!user) return res.status(404).json({ error: 'Не найден' });
        
        const { name, username, bio, settings, privacy } = req.body;
        
        if (name) user.name = name;
        if (username) user.username = username;
        if (bio) user.bio = bio;
        if (settings) user.settings = { ...user.settings, ...settings };
        if (privacy) user.privacy = { ...user.privacy, ...privacy };
        
        db.users.set(req.params.userId, user);
        saveData();
        
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Получение профиля
app.get('/api/user/profile/:userId', (req, res) => {
    try {
        const user = db.users.get(req.params.userId);
        if (!user) return res.status(404).json({ error: 'Не найден' });
        
        res.json({
            id: user.id,
            name: user.name,
            username: user.username,
            bio: user.bio,
            avatar: user.avatar,
            settings: user.settings,
            privacy: user.privacy
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Очистка данных пользователя
app.delete('/api/user/data/:userId', (req, res) => {
    try {
        db.users.delete(req.params.userId);
        saveData();
        io.emit('user_deleted', { userId: req.params.userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Socket.IO
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Подключён: ${socket.id}`);
    
    socket.on('auth', (data) => {
        const { userId } = data;
        const user = db.users.get(userId);
        
        if (!user) {
            socket.emit('auth_error', { error: 'Пользователь не найден' });
            return;
        }
        
        connectedUsers.set(socket.id, { userId, user });
        user.lastSeen = Date.now();
        db.users.set(userId, user);
        saveData();
        
        socket.emit('auth_success', { user });
        
        socket.broadcast.emit('user_status', {
            userId,
            status: 'online',
            lastSeen: Date.now()
        });
        
        console.log(`✅ Авторизован: ${user.name}`);
    });
    
    socket.on('send_message', (data) => {
        const { chatId, text, type = 'text' } = data;
        const connection = connectedUsers.get(socket.id);
        
        if (!connection) {
            socket.emit('error', { error: 'Не авторизован' });
            return;
        }
        
        const { userId, user } = connection;
        
        const messageId = uuidv4();
        const message = {
            id: messageId,
            chatId,
            senderId: userId,
            text,
            type,
            timestamp: Date.now(),
            status: 'sent',
            read: false
        };
        
        if (!db.messages.has(chatId)) db.messages.set(chatId, []);
        db.messages.get(chatId).push(message);
        saveData();
        
        io.emit('new_message', {
            chatId,
            message: {
                ...message,
                sender: { id: user.id, name: user.name }
            }
        });
        
        if (db.chats.has(chatId)) {
            const chat = db.chats.get(chatId);
            chat.lastMessage = text;
            chat.lastMessageTime = Date.now();
            db.chats.set(chatId, chat);
            saveData();
        }
    });
    
    socket.on('typing', (data) => {
        const { chatId, isTyping } = data;
        const connection = connectedUsers.get(socket.id);
        if (!connection) return;
        
        socket.broadcast.emit('user_typing', {
            chatId,
            userId: connection.userId,
            username: connection.user.name,
            isTyping
        });
    });
    
    socket.on('mark_read', (data) => {
        const { chatId, messageIds } = data;
        const connection = connectedUsers.get(socket.id);
        if (!connection) return;
        
        const messages = db.messages.get(chatId) || [];
        messages.forEach(msg => {
            if (messageIds.includes(msg.id) && msg.senderId !== connection.userId) {
                msg.status = 'read';
                msg.read = true;
            }
        });
        
        db.messages.set(chatId, messages);
        saveData();
        
        io.emit('messages_read', { chatId, messageIds, readBy: connection.userId });
    });
    
    socket.on('disconnect', () => {
        const connection = connectedUsers.get(socket.id);
        if (connection) {
            const user = db.users.get(connection.userId);
            if (user) {
                user.lastSeen = Date.now();
                db.users.set(connection.userId, user);
                saveData();
            }
            
            socket.broadcast.emit('user_status', {
                userId: connection.userId,
                status: 'offline',
                lastSeen: Date.now()
            });
            
            connectedUsers.delete(socket.id);
        }
        console.log(`🔌 Отключён: ${socket.id}`);
    });
});

// Запуск
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  🚀 PRICONNECTE MESSENGER                  ║');
    console.log(`║  🌐 Порт: ${PORT}                              ║`);
    console.log('║  ✅ Сервер запущен!                         ║');
    console.log(`║  📱 http://localhost:${PORT}                   ║`);
    console.log('╚════════════════════════════════════════════╝');
});

process.on('SIGINT', () => {
    console.log('\n🛑 Остановка...');
    saveData();
    process.exit(0);
});
