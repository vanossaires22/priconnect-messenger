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
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// База данных
const db = {
    users: new Map(),
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
        } catch (e) {
            console.log('⚠️ Новая база данных');
        }
    }
}

loadData();

// API: Создание пользователя
app.post('/api/user/create', (req, res) => {
    try {
        const userId = uuidv4();
        const user = {
            id: userId,
            name: req.body.name || 'Гость ' + Math.floor(Math.random() * 1000),
            username: '@user' + Math.floor(Math.random() * 10000),
            bio: '',
            email: '',
            avatar: null,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            settings: {
                theme: 'dark',
                notifications: true,
                enterSend: true,
                fontSize: 14
            },
            privacy: {
                online: 'everyone',
                photo: 'everyone',
                lastSeen: 'everyone'
            },
            blocked: []
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
        
        const { name, username, bio, email, settings, privacy } = req.body;
        
        if (name !== undefined) user.name = name;
        if (username !== undefined) user.username = username;
        if (bio !== undefined) user.bio = bio;
        if (email !== undefined) user.email = email;
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
            email: user.email,
            avatar: user.avatar,
            settings: user.settings,
            privacy: user.privacy
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Очистка данных
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
        const user = db.users.get(data.userId);
        if (!user) {
            socket.emit('auth_error', { error: 'Пользователь не найден' });
            return;
        }
        
        connectedUsers.set(socket.id, { userId: data.userId, user });
        user.lastSeen = Date.now();
        db.users.set(data.userId, user);
        saveData();
        
        socket.emit('auth_success', { user });
        socket.broadcast.emit('user_status', { userId: data.userId, status: 'online' });
        console.log(`✅ Авторизован: ${user.name}`);
    });
    
    socket.on('send_message', (data) => {
        const connection = connectedUsers.get(socket.id);
        if (!connection) {
            socket.emit('error', { error: 'Не авторизован' });
            return;
        }
        
        const { userId, user } = connection;
        const messageId = uuidv4();
        
        const message = {
            id: messageId,
            chatId: data.chatId,
            senderId: userId,
            text: data.text,
            type: data.type || 'text',
            file: data.file || null,
            timestamp: Date.now(),
            status: 'sent',
            read: false
        };
        
        if (!db.messages.has(data.chatId)) db.messages.set(data.chatId, []);
        db.messages.get(data.chatId).push(message);
        saveData();
        
        io.emit('new_message', {
            chatId: data.chatId,
            message: { ...message, sender: { id: user.id, name: user.name } }
        });
        
        if (db.chats.has(data.chatId)) {
            const chat = db.chats.get(data.chatId);
            chat.lastMessage = data.text;
            chat.lastMessageTime = Date.now();
            db.chats.set(data.chatId, chat);
            saveData();
        }
    });
    
    socket.on('typing', (data) => {
        const connection = connectedUsers.get(socket.id);
        if (!connection) return;
        
        socket.broadcast.emit('user_typing', {
            chatId: data.chatId,
            userId: connection.userId,
            username: connection.user.name,
            isTyping: data.isTyping
        });
    });
    
    socket.on('mark_read', (data) => {
        const connection = connectedUsers.get(socket.id);
        if (!connection) return;
        
        const messages = db.messages.get(data.chatId) || [];
        messages.forEach(msg => {
            if (data.messageIds.includes(msg.id) && msg.senderId !== connection.userId) {
                msg.status = 'read';
                msg.read = true;
            }
        });
        
        db.messages.set(data.chatId, messages);
        saveData();
        io.emit('messages_read', { chatId: data.chatId, messageIds: data.messageIds });
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
            socket.broadcast.emit('user_status', { userId: connection.userId, status: 'offline' });
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
