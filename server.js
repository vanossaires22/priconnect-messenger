/* ========================================== */
/* PRICONNECTE MESSENGER - BACKEND SERVER     */
/* ========================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Инициализация приложения
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// БАЗА ДАННЫХ В ПАМЯТИ (для демонстрации)
// ==========================================
const db = {
    users: new Map(),
    sessions: new Map(),
    messages: new Map(),
    chats: new Map()
};

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function generateVerificationCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

function saveData() {
    // Сохранение в файлы для персистентности
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(Array.from(db.users.entries())));
    fs.writeFileSync(path.join(dataDir, 'sessions.json'), JSON.stringify(Array.from(db.sessions.entries())));
    fs.writeFileSync(path.join(dataDir, 'messages.json'), JSON.stringify(Array.from(db.messages.entries())));
    fs.writeFileSync(path.join(dataDir, 'chats.json'), JSON.stringify(Array.from(db.chats.entries())));
}

function loadData() {
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
        try {
            const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
            const sessions = JSON.parse(fs.readFileSync(path.join(dataDir, 'sessions.json'), 'utf8'));
            const messages = JSON.parse(fs.readFileSync(path.join(dataDir, 'messages.json'), 'utf8'));
            const chats = JSON.parse(fs.readFileSync(path.join(dataDir, 'chats.json'), 'utf8'));
            
            db.users = new Map(users);
            db.sessions = new Map(sessions);
            db.messages = new Map(messages);
            db.chats = new Map(chats);
            
            console.log('✅ Данные загружены из файлов');
        } catch (error) {
            console.log('⚠️ Не удалось загрузить данные, создаем новые');
        }
    }
}

// Загрузка данных при старте
loadData();

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
    try {
        const { phone, username, password } = req.body;
        
        if (!phone || !username) {
            return res.status(400).json({ error: 'Телефон и имя обязательны' });
        }
        
        // Проверка существующего пользователя
        for (const [id, user] of db.users) {
            if (user.phone === phone) {
                return res.status(409).json({ error: 'Пользователь уже существует' });
            }
        }
        
        const userId = uuidv4();
        const verificationCode = generateVerificationCode();
        
        const user = {
            id: userId,
            phone,
            username,
            password: password ? hashPassword(password) : null,
            verificationCode,
            verificationCodeExpiry: Date.now() + 300000, // 5 минут
            twoFAEnabled: false,
            twoFAPassword: null,
            twoFAHint: null,
            recoveryEmail: null,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            profile: {
                firstName: username,
                lastName: '',
                bio: '',
                avatar: null
            },
            settings: {
                theme: 'light',
                notifications: true,
                language: 'ru'
            },
            privacy: {
                phoneNumber: 'everyone',
                profilePhoto: 'everyone',
                lastSeen: 'everyone',
                forwardMessages: 'everyone'
            }
        };
        
        db.users.set(userId, user);
        saveData();
        
        // В реальном приложении здесь была бы отправка SMS
        console.log(`📱 Код подтверждения для ${phone}: ${verificationCode}`);
        
        res.json({ 
            success: true, 
            userId, 
            message: 'Код отправлен',
            debugCode: verificationCode // Только для демонстрации
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка кода подтверждения
app.post('/api/auth/verify', (req, res) => {
    try {
        const { userId, code } = req.body;
        
        const user = db.users.get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Неверный код' });
        }
        
        if (Date.now() > user.verificationCodeExpiry) {
            return res.status(400).json({ error: 'Код истек' });
        }
        
        // Генерация токена сессии
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            userId,
            device: req.headers['user-agent'] || 'Unknown',
            ip: req.ip || 'Unknown',
            createdAt: Date.now(),
            lastActive: Date.now()
        };
        
        db.sessions.set(sessionId, session);
        
        // Очистка кода подтверждения
        user.verificationCode = null;
        user.verificationCodeExpiry = null;
        db.users.set(userId, user);
        saveData();
        
        res.json({
            success: true,
            sessionId,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                twoFAEnabled: user.twoFAEnabled
            }
        });
    } catch (error) {
        console.error('Ошибка верификации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход с паролем 2FA
app.post('/api/auth/2fa', (req, res) => {
    try {
        const { userId, password } = req.body;
        
        const user = db.users.get(userId);
        if (!user || !user.twoFAEnabled) {
            return res.status(400).json({ error: '2FA не включена' });
        }
        
        if (!verifyPassword(password, user.twoFAPassword)) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }
        
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            userId,
            device: req.headers['user-agent'] || 'Unknown',
            ip: req.ip || 'Unknown',
            createdAt: Date.now(),
            lastActive: Date.now()
        };
        
        db.sessions.set(sessionId, session);
        saveData();
        
        res.json({
            success: true,
            sessionId,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Ошибка 2FA:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Выход из аккаунта
app.post('/api/auth/logout', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (sessionId && db.sessions.has(sessionId)) {
            db.sessions.delete(sessionId);
            saveData();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка выхода:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение профиля пользователя
app.get('/api/user/profile/:userId', (req, res) => {
    try {
        const user = db.users.get(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({
            id: user.id,
            username: user.username,
            phone: user.phone,
            profile: user.profile,
            settings: user.settings,
            privacy: user.privacy,
            lastSeen: user.lastSeen
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление профиля
app.put('/api/user/profile/:userId', (req, res) => {
    try {
        const user = db.users.get(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const { profile, settings, privacy } = req.body;
        
        if (profile) {
            user.profile = { ...user.profile, ...profile };
        }
        
        if (settings) {
            user.settings = { ...user.settings, ...settings };
        }
        
        if (privacy) {
            user.privacy = { ...user.privacy, ...privacy };
        }
        
        db.users.set(req.params.userId, user);
        saveData();
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Включение 2FA
app.post('/api/user/2fa/enable', (req, res) => {
    try {
        const { userId, password, hint, email } = req.body;
        
        const user = db.users.get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        user.twoFAEnabled = true;
        user.twoFAPassword = hashPassword(password);
        user.twoFAHint = hint || null;
        user.recoveryEmail = email || null;
        
        db.users.set(userId, user);
        saveData();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка включения 2FA:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Отключение 2FA
app.post('/api/user/2fa/disable', (req, res) => {
    try {
        const { userId, password } = req.body;
        
        const user = db.users.get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (!verifyPassword(password, user.twoFAPassword)) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }
        
        user.twoFAEnabled = false;
        user.twoFAPassword = null;
        user.twoFAHint = null;
        
        db.users.set(userId, user);
        saveData();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка отключения 2FA:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение активных сеансов
app.get('/api/user/sessions/:userId', (req, res) => {
    try {
        const sessions = [];
        
        for (const [id, session] of db.sessions) {
            if (session.userId === req.params.userId) {
                sessions.push({
                    id: session.id,
                    device: session.device,
                    ip: session.ip,
                    createdAt: session.createdAt,
                    lastActive: session.lastActive
                });
            }
        }
        
        res.json({ sessions });
    } catch (error) {
        console.error('Ошибка получения сеансов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Завершение сеанса
app.delete('/api/user/session/:sessionId', (req, res) => {
    try {
        if (db.sessions.has(req.params.sessionId)) {
            db.sessions.delete(req.params.sessionId);
            saveData();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка завершения сеанса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление аккаунта
app.delete('/api/user/account/:userId', (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Удаление всех сеансов пользователя
        for (const [sessionId, session] of db.sessions) {
            if (session.userId === userId) {
                db.sessions.delete(sessionId);
            }
        }
        
        // Удаление пользователя
        db.users.delete(userId);
        saveData();
        
        // Уведомление всем подключенным клиентам
        io.emit('user_deleted', { userId });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка удаления аккаунта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==========================================
// SOCKET.IO REAL-TIME COMMUNICATION
// ==========================================

// Хранение подключенных пользователей
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Пользователь подключился: ${socket.id}`);
    
    // Авторизация пользователя
    socket.on('auth', (data) => {
        const { userId, sessionId } = data;
        
        const session = db.sessions.get(sessionId);
        if (!session || session.userId !== userId) {
            socket.emit('auth_error', { error: 'Неверная сессия' });
            return;
        }
        
        const user = db.users.get(userId);
        if (!user) {
            socket.emit('auth_error', { error: 'Пользователь не найден' });
            return;
        }
        
        // Сохранение подключения
        connectedUsers.set(socket.id, { userId, sessionId, user });
        
        // Обновление статуса пользователя
        user.lastSeen = Date.now();
        db.users.set(userId, user);
        saveData();
        
        socket.emit('auth_success', {
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                profile: user.profile
            }
        });
        
        // Уведомление контактов о статусе онлайн
        socket.broadcast.emit('user_status', {
            userId,
            status: 'online',
            lastSeen: Date.now()
        });
        
        console.log(`✅ Пользователь авторизован: ${user.username}`);
    });
    
    // Отправка сообщения
    socket.on('send_message', (data) => {
        const { chatId, text, type = 'text' } = data;
        const connection = connectedUsers.get(socket.id);
        
        if (!connection) {
            socket.emit('error', { error: 'Не авторизован' });
            return;
        }
        
        const { userId, user } = connection;
        
        // Создание сообщения
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
        
        // Сохранение сообщения
        if (!db.messages.has(chatId)) {
            db.messages.set(chatId, []);
        }
        db.messages.get(chatId).push(message);
        saveData();
        
        // Отправка всем участникам чата
        io.emit('new_message', {
            chatId,
            message: {
                ...message,
                sender: {
                    id: user.id,
                    username: user.username
                }
            }
        });
        
        // Обновление последнего сообщения в чате
        if (db.chats.has(chatId)) {
            const chat = db.chats.get(chatId);
            chat.lastMessage = text;
            chat.lastMessageTime = Date.now();
            db.chats.set(chatId, chat);
            saveData();
        }
        
        console.log(`📤 Сообщение отправлено: ${messageId}`);
    });
    
    // Статус набора текста
    socket.on('typing', (data) => {
        const { chatId, isTyping } = data;
        const connection = connectedUsers.get(socket.id);
        
        if (!connection) return;
        
        socket.broadcast.emit('user_typing', {
            chatId,
            userId: connection.userId,
            username: connection.user.username,
            isTyping
        });
    });
    
    // Прочтение сообщений
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
        
        io.emit('messages_read', {
            chatId,
            messageIds,
            readBy: connection.userId
        });
    });
    
    // Статус онлайн/офлайн
    socket.on('set_status', (data) => {
        const { status } = data;
        const connection = connectedUsers.get(socket.id);
        
        if (!connection) return;
        
        const user = db.users.get(connection.userId);
        if (user) {
            user.lastSeen = Date.now();
            db.users.set(connection.userId, user);
            saveData();
        }
        
        socket.broadcast.emit('user_status', {
            userId: connection.userId,
            status,
            lastSeen: Date.now()
        });
    });
    
    // Отключение
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
        
        console.log(`🔌 Пользователь отключился: ${socket.id}`);
    });
    
    // Ошибка
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                                                    ║');
    console.log('║   🚀 PRICONNECTE MESSENGER SERVER                  ║');
    console.log('║   ✅ Сервер запущен успешно!                        ║');
    console.log('║                                                    ║');
    console.log(`║   🌐 Порт: ${PORT}                                    ║`);
    console.log('║   📡 Socket.IO: Активен                            ║');
    console.log('║   📁 Статические файлы: Раздаются                  ║');
    console.log('║                                                    ║');
    console.log('║   📱 Откройте в браузере:                          ║');
    console.log(`║      http://localhost:${PORT}                         ║`);
    console.log('║                                                    ║');
    console.log('╚════════════════════════════════════════════════════╝');
});

// Обработка незавершенных процессов
process.on('SIGTERM', () => {
    console.log('\n🛑 Сервер останавливается...');
    saveData();
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Сервер останавливается...');
    saveData();
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});
