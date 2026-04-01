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

function saveData() {
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

// РЕГИСТРАЦИЯ (Email + Password)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
        }
        
        // Проверка существующего пользователя
        for (const [id, user] of db.users) {
            if (user.email === email) {
                return res.status(409).json({ error: 'Email уже зарегистрирован' });
            }
        }
        
        const userId = uuidv4();
        
        const user = {
            id: userId,
            name,
            email,
            password: hashPassword(password),
            twoFAEnabled: false,
            twoFAPassword: null,
            twoFAHint: null,
            recoveryEmail: null,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            profile: {
                firstName: name,
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
                email: 'contacts',
                profilePhoto: 'everyone',
                lastSeen: 'everyone',
                forwardMessages: 'everyone'
            }
        };
        
        db.users.set(userId, user);
        saveData();
        
        console.log(`📧 Новый пользователь зарегистрирован: ${email}`);
        
        res.json({ 
            success: true, 
            userId,
            message: 'Регистрация успешна'
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ВХОД (Email + Password)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }
        
        // Поиск пользователя по email
        let user = null;
        for (const [id, userData] of db.users) {
            if (userData.email === email) {
                user = userData;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверка пароля
        if (!verifyPassword(password, user.password)) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }
        
        // Генерация токена сессии
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            userId: user.id,
            device: req.headers['user-agent'] || 'Unknown',
            ip: req.ip || 'Unknown',
            createdAt: Date.now(),
            lastActive: Date.now()
        };
        
        db.sessions.set(sessionId, session);
        
        // Обновление lastSeen
        user.lastSeen = Date.now();
        db.users.set(user.id, user);
        saveData();
        
        res.json({
            success: true,
            sessionId,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                twoFAEnabled: user.twoFAEnabled
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Восстановление пароля
app.post('/api/auth/recover', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email обязателен' });
        }
        
        // Поиск пользователя
        let user = null;
        for (const [id, userData] of db.users) {
            if (userData.email === email) {
                user = userData;
                break;
            }
        }
        
        if (!user) {
            // Не показываем существует ли пользователь (безопасность)
            return res.json({ success: true, message: 'Если email зарегистрирован, инструкция отправлена' });
        }
        
        // В реальном приложении здесь была бы отправка email
        const resetToken = uuidv4();
        console.log(`📧 Токен сброса пароля для ${email}: ${resetToken}`);
        
        res.json({ 
            success: true, 
            message: 'Если email зарегистрирован, инструкция отправлена',
            debugToken: resetToken // Только для демонстрации
        });
    } catch (error) {
        console.error('Ошибка восстановления:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Смена пароля
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, sessionId, currentPassword, newPassword } = req.body;
        
        // Проверка сессии
        const session = db.sessions.get(sessionId);
        if (!session || session.userId !== userId) {
            return res.status(401).json({ error: 'Неавторизован' });
        }
        
        const user = db.users.get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверка текущего пароля
        if (!verifyPassword(currentPassword, user.password)) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Новый пароль должен быть минимум 6 символов' });
        }
        
        // Обновление пароля
        user.password = hashPassword(newPassword);
        db.users.set(userId, user);
        saveData();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
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
            name: user.name,
            email: user.email,
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
        const { password } = req.body;
        
        const user = db.users.get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверка пароля
        if (!verifyPassword(password, user.password)) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }
        
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

const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Пользователь подключился: ${socket.id}`);
    
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
        
        connectedUsers.set(socket.id, { userId, sessionId, user });
        
        user.lastSeen = Date.now();
        db.users.set(userId, user);
        saveData();
        
        socket.emit('auth_success', {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profile: user.profile
            }
        });
        
        socket.broadcast.emit('user_status', {
            userId,
            status: 'online',
            lastSeen: Date.now()
        });
        
        console.log(`✅ Пользователь авторизован: ${user.name}`);
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
        
        if (!db.messages.has(chatId)) {
            db.messages.set(chatId, []);
        }
        db.messages.get(chatId).push(message);
        saveData();
        
        io.emit('new_message', {
            chatId,
            message: {
                ...message,
                sender: {
                    id: user.id,
                    name: user.name
                }
            }
        });
        
        if (db.chats.has(chatId)) {
            const chat = db.chats.get(chatId);
            chat.lastMessage = text;
            chat.lastMessageTime = Date.now();
            db.chats.set(chatId, chat);
            saveData();
        }
        
        console.log(`📤 Сообщение отправлено: ${messageId}`);
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
        
        io.emit('messages_read', {
            chatId,
            messageIds,
            readBy: connection.userId
        });
    });
    
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
