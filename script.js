// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================
let currentUser = null;
let currentChat = null;
let socket = null;
let chats = [];
let contacts = [];
let messages = {};
let isDarkTheme = true;
let typingTimeout = null;
let blockedUsers = [];
let notificationSettings = { sound: true, vibrate: true, desktop: true };
let mediaFiles = [];
let selectedContactId = null;

// ==========================================
// БОТЫ ДЛЯ ОБЩЕНИЯ (10 ШТУК)
// ==========================================
const bots = [
    {
        id: 1,
        name: 'Павел Дуров',
        avatar: 'П',
        bio: 'Founder of Telegram & Priconnecte',
        color: 'linear-gradient(135deg, #667eea, #764ba2)',
        responses: ['Привет! Как тебе Priconnecte?', 'Работаем над новыми функциями!', 'Скоро будут обновления!']
    },
    {
        id: 2,
        name: 'Поддержка',
        avatar: 'П',
        bio: 'Техническая поддержка 24/7',
        color: 'linear-gradient(135deg, #4caf50, #45a049)',
        responses: ['Чем могу помочь?', 'Ваш вопрос важен для нас!', 'Сейчас проверю...']
    },
    {
        id: 3,
        name: 'Новости',
        avatar: 'Н',
        bio: 'Последние новости мира',
        color: 'linear-gradient(135deg, #f093fb, #f5576c)',
        responses: ['📰 Новая статья!', 'Срочные новости!', 'Читайте подробнее...']
    },
    {
        id: 4,
        name: 'Погода',
        avatar: '☀',
        bio: 'Прогноз погоды',
        color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        responses: ['☀️ Сегодня солнечно!', '🌧️ Возможен дождь', '🌡️ +25°C']
    },
    {
        id: 5,
        name: 'Музыка',
        avatar: '🎵',
        bio: 'Твои любимые треки',
        color: 'linear-gradient(135deg, #fa709a, #fee140)',
        responses: ['🎶 Новый хит!', 'Слушай сейчас!', 'Рекомендуем...']
    },
    {
        id: 6,
        name: 'Спорт',
        avatar: '⚽',
        bio: 'Спортивные новости',
        color: 'linear-gradient(135deg, #a8edea, #fed6e3)',
        responses: ['⚽ Гол!', '🏆 Победа!', 'Счёт 2:1']
    },
    {
        id: 7,
        name: 'Кино',
        avatar: '🎬',
        bio: 'Фильмы и сериалы',
        color: 'linear-gradient(135deg, #667eea, #764ba2)',
        responses: ['🎬 Новинка недели!', 'Рекомендуем к просмотру', '⭐ 8.5/10']
    },
    {
        id: 8,
        name: 'Еда',
        avatar: '🍕',
        bio: 'Рецепты и рестораны',
        color: 'linear-gradient(135deg, #f093fb, #f5576c)',
        responses: ['🍕 Вкусно!', 'Новый рецепт', 'Заказывай сейчас!']
    },
    {
        id: 9,
        name: 'Путешествия',
        avatar: '✈',
        bio: 'Мир вокруг нас',
        color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        responses: ['✈️ Новые направления!', '🏖️ Отдых мечты', 'Бронируй сейчас!']
    },
    {
        id: 10,
        name: 'Избранное',
        avatar: '★',
        bio: 'Сохранённые сообщения',
        color: 'linear-gradient(135deg, #fa709a, #fee140)',
        responses: ['Сохранено!', 'Добавлено в избранное', '📌 Закреплено']
    }
];

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🚀 Priconnecte Messenger', 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 16px; padding: 10px; border-radius: 8px;');
    
    loadTheme();
    loadSettings();
    initializeSocket();
    checkOrCreateUser();
    setupInputHandlers();
    loadBlockedUsers();
    renderEmojiPicker();
});

// ==========================================
// SOCKET.IO
// ==========================================
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => console.log('✅ Подключено:', socket.id));
    
    socket.on('auth_success', (data) => {
        currentUser = data.user;
        updateProfileUI();
        console.log('✅ Авторизован:', currentUser.name);
    });
    
    socket.on('auth_error', (data) => showNotification(data.error, 'error'));
    socket.on('new_message', (data) => handleNewMessage(data));
    socket.on('user_typing', (data) => showTypingIndicator(data));
    socket.on('messages_read', (data) => updateMessageStatus(data));
    socket.on('disconnect', () => showNotification('Потеряно соединение', 'error'));
}

// ==========================================
// ПОЛЬЗОВАТЕЛЬ
// ==========================================
async function checkOrCreateUser() {
    let userData = localStorage.getItem('priconnecte_user');
    
    if (userData) {
        currentUser = JSON.parse(userData);
        socket.emit('auth', { userId: currentUser.id });
        initApp();
    } else {
        await createUser();
    }
}

async function createUser() {
    const guestName = 'Гость ' + Math.floor(Math.random() * 1000);
    
    try {
        const response = await fetch('/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: guestName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('priconnecte_user', JSON.stringify(currentUser));
            socket.emit('auth', { userId: currentUser.id });
            initApp();
            showNotification('Добро пожаловать в Priconnecte! 🎉', 'success');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка подключения', 'error');
    }
}

function initApp() {
    generateChatsWithBots();
    renderChatList();
    renderContacts();
    renderNewChatContacts();
    if (chats.length > 0) selectChat(chats[0].id);
}

// ==========================================
// ЧАТЫ С БОТАМИ
// ==========================================
function generateChatsWithBots() {
    chats = bots.map((bot, index) => ({
        id: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        bio: bot.bio,
        lastMessage: bot.responses[Math.floor(Math.random() * bot.responses.length)],
        time: formatTime(Date.now() - Math.random() * 86400000),
        unread: Math.floor(Math.random() * 5),
        online: Math.random() > 0.5,
        pinned: index < 2,
        muted: false,
        archived: false,
        color: bot.color,
        isBot: true,
        botData: bot
    }));
    
    // Генерация сообщений для каждого чата
    chats.forEach(chat => {
        if (!messages[chat.id]) {
            messages[chat.id] = [
                { id: 1, text: `👋 Привет! Я ${chat.name}`, type: 'in', time: '10:00', read: true },
                { id: 2, text: 'Чем могу помочь?', type: 'in', time: '10:01', read: true }
            ];
        }
    });
}

function renderChatList(filter = 'all') {
    const container = document.getElementById('chat-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    let filteredChats = chats;
    
    if (filter === 'unread') {
        filteredChats = chats.filter(c => c.unread > 0);
    } else if (filter === 'archived') {
        filteredChats = chats.filter(c => c.archived);
    } else {
        filteredChats = chats.filter(c => !c.archived);
    }
    
    const pinned = filteredChats.filter(c => c.pinned);
    const unpinned = filteredChats.filter(c => !c.pinned);
    const sortedChats = [...pinned, ...unpinned];
    
    sortedChats.forEach(chat => {
        const el = document.createElement('div');
        el.className = `chat-item${chat.pinned ? ' pinned' : ''}${currentChat && currentChat.id === chat.id ? ' active' : ''}`;
        el.dataset.chatId = chat.id;
        el.onclick = () => selectChat(chat.id);
        
        el.innerHTML = `
            <div class="avatar-gradient" style="background: ${chat.color}">${chat.avatar}
                ${chat.online ? '<span class="status-dot online"></span>' : ''}
            </div>
            <div class="chat-info">
                <div class="chat-top">
                    <h4>${escapeHtml(chat.name)}</h4>
                    <span class="time">${chat.time}</span>
                </div>
                <div class="chat-bottom">
                    <p class="last-message">${escapeHtml(chat.lastMessage)}</p>
                    ${chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ''}
                    ${chat.muted ? '<i class="fas fa-bell-slash" style="color: var(--text-hint); margin-left: 8px;"></i>' : ''}
                </div>
            </div>
        `;
        
        container.appendChild(el);
    });
}

function filterChats(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    renderChatList(tab);
}

function selectChat(chatId) {
    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
    const selected = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (selected) selected.classList.add('active');
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        currentChat = chat;
        
        document.getElementById('current-chat-name').textContent = chat.name;
        document.getElementById('current-chat-initial').textContent = chat.avatar;
        document.getElementById('current-chat-avatar').style.background = chat.color;
        document.getElementById('current-chat-status').innerHTML = chat.online ? 
            '<i class="fas fa-circle online-dot"></i> в сети' : 'был(а) недавно';
        
        document.getElementById('info-panel-name').textContent = chat.name;
        document.getElementById('info-panel-initial').textContent = chat.avatar;
        document.getElementById('info-panel-status').innerHTML = chat.online ?
            '<i class="fas fa-circle online-dot"></i> в сети' : 'был(а) недавно';
        document.getElementById('info-panel-username').textContent = chat.bio || '@' + chat.name.toLowerCase();
        document.getElementById('info-panel-bio').textContent = chat.bio || 'О себе не указано';
        
        loadMessages(chatId);
        chat.unread = 0;
        renderChatList();
    }
}

function loadMessages(chatId) {
    const container = document.getElementById('messages-box');
    if (!container) return;
    container.innerHTML = '<div class="message date-divider"><span>Сегодня</span></div>';
    
    const chatMessages = messages[chatId] || [];
    
    chatMessages.forEach(msg => {
        addMessageToDOM(msg.text, msg.type, msg.time, msg.read, msg.file);
    });
    
    scrollToBottom();
}

function handleNewMessage(data) {
    const { chatId, message } = data;
    
    if (currentChat && chatId === currentChat.id) {
        const isOut = message.sender && message.sender.id === currentUser.id;
        addMessageToDOM(message.text, isOut ? 'out' : 'in', formatTime(message.timestamp), isOut, message.file);
        if (!isOut) socket.emit('mark_read', { chatId, messageIds: [message.id] });
    } else {
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = message.text;
            chat.time = formatTime(message.timestamp);
            if (!message.sender || message.sender.id !== currentUser.id) chat.unread++;
            renderChatList();
        }
    }
    scrollToBottom();
    
    if (notificationSettings.sound) playNotificationSound();
    if (notificationSettings.vibrate && navigator.vibrate) navigator.vibrate(200);
}

function addMessageToDOM(text, type, time, read = false, file = null) {
    const container = document.getElementById('messages-box');
    if (!container) return;
    
    const div = document.createElement('div');
    
    if (file && file.type === 'image') {
        div.className = `message ${type} image-message`;
        div.innerHTML = `<img src="${file.url}" alt="Image" onclick="viewImage('${file.url}')">
            <span class="message-meta">${time}${type === 'out' ? (read ? ' <i class="fas fa-check-double"></i>' : ' <i class="fas fa-check"></i>') : ''}</span>`;
    } else if (file && file.type === 'file') {
        div.className = `message ${type} file-message`;
        div.innerHTML = `<div class="file-icon"><i class="fas fa-file"></i></div>
            <div class="file-info"><div class="file-name">${file.name}</div><div class="file-size">${file.size}</div></div>
            <span class="message-meta">${time}</span>`;
    } else {
        div.className = `message ${type}`;
        div.innerHTML = `${escapeHtml(text)}<span class="message-meta">${time}${type === 'out' ? (read ? ' <i class="fas fa-check-double"></i>' : ' <i class="fas fa-check"></i>') : ''}</span>`;
    }
    
    container.appendChild(div);
    scrollToBottom();
    
    if (file) mediaFiles.push({ type: file.type, url: file.url, name: file.name });
}

// ==========================================
// ОТПРАВКА СООБЩЕНИЙ (ИСПРАВЛЕНО!)
// ==========================================
function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentChat) {
        showNotification('Введите сообщение', 'error');
        return;
    }
    
    // Отправка через сокет (если подключён)
    if (socket && socket.connected) {
        socket.emit('send_message', { chatId: currentChat.id, text, type: 'text' });
    }
    
    // Локальное добавление сообщения (работает всегда!)
    if (!messages[currentChat.id]) messages[currentChat.id] = [];
    
    const newMessage = {
        id: Date.now(),
        text: text,
        type: 'out',
        time: formatTime(Date.now()),
        read: false
    };
    
    messages[currentChat.id].push(newMessage);
    
    // Обновление чата
    currentChat.lastMessage = text;
    currentChat.time = formatTime(Date.now());
    
    // Очистка поля
    input.value = '';
    toggleSendButton();
    
    // Прокрутка
    loadMessages(currentChat.id);
    renderChatList();
    
    // Ответ бота через 1-3 секунды
    if (currentChat.isBot && currentChat.botData) {
        showTyping();
        setTimeout(() => {
            botReply(currentChat);
        }, 1000 + Math.random() * 2000);
    }
    
    showNotification('Сообщение отправлено', 'success');
}

function botReply(chat) {
    if (!chat.botData) return;
    
    const responses = chat.botData.responses;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    if (!messages[chat.id]) messages[chat.id] = [];
    
    messages[chat.id].push({
        id: Date.now(),
        text: randomResponse,
        type: 'in',
        time: formatTime(Date.now()),
        read: true
    });
    
    chat.lastMessage = randomResponse;
    chat.time = formatTime(Date.now());
    
    if (currentChat && currentChat.id === chat.id) {
        loadMessages(chat.id);
    }
    renderChatList();
    
    hideTyping();
}

function showTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.classList.remove('hidden');
}

function hideTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.classList.add('hidden');
}

function handleEnter(e) {
    const enterSend = document.getElementById('enter-send-switch');
    if (e.key === 'Enter' && !e.shiftKey && (!enterSend || enterSend.checked)) {
        e.preventDefault();
        sendMessage();
    }
}

function handleTyping() {
    if (!currentChat) return;
    if (socket && socket.connected) {
        socket.emit('typing', { chatId: currentChat.id, isTyping: true });
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (socket && socket.connected) {
            socket.emit('typing', { chatId: currentChat.id, isTyping: false });
        }
    }, 2000);
}

function toggleSendButton() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('send-mic-toggle');
    
    if (!input || !sendBtn || !micBtn) return;
    
    if (input.value.trim()) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
    } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
    }
}

function scrollToBottom() {
    const container = document.getElementById('messages-box');
    if (container) container.scrollTop = container.scrollHeight;
}

function setupInputHandlers() {
    const input = document.getElementById('message-input');
    if (input) {
        input.addEventListener('input', () => { toggleSendButton(); handleTyping(); });
        input.addEventListener('keypress', handleEnter);
    }
    
    const search = document.getElementById('chat-search');
    if (search) {
        search.addEventListener('input', function() {
            const q = this.value.toLowerCase();
            document.querySelectorAll('.chat-item').forEach(item => {
                const name = item.querySelector('h4').textContent.toLowerCase();
                const msg = item.querySelector('.last-message').textContent.toLowerCase();
                item.style.display = (name.includes(q) || msg.includes(q)) ? 'flex' : 'none';
            });
        });
    }
}

// ==========================================
// ПРОФИЛЬ (ИСПРАВЛЕНО!)
// ==========================================
function updateProfileUI() {
    if (!currentUser) return;
    
    const miniUsername = document.getElementById('mini-username');
    const miniAvatarInitial = document.getElementById('mini-avatar-initial');
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileBio = document.getElementById('profile-bio');
    const profileEmail = document.getElementById('profile-email');
    const profileAvatarInitial = document.getElementById('profile-avatar-initial');
    
    if (miniUsername) miniUsername.textContent = currentUser.name;
    if (miniAvatarInitial) miniAvatarInitial.textContent = currentUser.name.charAt(0).toUpperCase();
    if (profileName) profileName.value = currentUser.name;
    if (profileUsername) profileUsername.value = currentUser.username;
    if (profileBio) profileBio.value = currentUser.bio || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
    if (profileAvatarInitial) profileAvatarInitial.textContent = currentUser.name.charAt(0).toUpperCase();
    
    if (currentUser.settings) {
        const themeSwitch = document.getElementById('theme-switch');
        if (themeSwitch) themeSwitch.checked = currentUser.settings.theme === 'dark';
    }
}

function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    const username = document.getElementById('profile-username').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    
    if (!name) {
        showNotification('Введите имя', 'error');
        return;
    }
    
    // Обновление локально
    currentUser.name = name;
    currentUser.username = username;
    currentUser.bio = bio;
    currentUser.email = email;
    
    // Сохранение в localStorage
    localStorage.setItem('priconnecte_user', JSON.stringify(currentUser));
    
    // Отправка на сервер
    fetch(`/api/user/profile/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, bio, email })
    }).then(response => {
        if (response.ok) {
            updateProfileUI();
            closeModal('profile-modal');
            showNotification('Профиль сохранён ✅', 'success');
        }
    }).catch(error => {
        console.error('Ошибка:', error);
        // Всё равно сохраняем локально
        updateProfileUI();
        closeModal('profile-modal');
        showNotification('Профиль сохранён локально', 'success');
    });
}

function changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                showNotification('Аватар обновлён', 'success');
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// ==========================================
// ИНТЕРФЕЙС
// ==========================================
function toggleMenu() {
    document.getElementById('sidebar-menu').classList.toggle('hidden');
}

function toggleInfoPanel() {
    document.getElementById('info-panel').classList.toggle('hidden');
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('sidebar-menu').classList.add('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function openSavedMessages() {
    const saved = chats.find(c => c.name === 'Избранное');
    if (saved) selectChat(saved.id);
    showNotification('Избранное открыто', 'info');
}

function createGroup() {
    const name = document.getElementById('group-name-input').value;
    if (name) {
        const newChat = {
            id: Date.now(),
            name: name,
            avatar: name.charAt(0).toUpperCase(),
            lastMessage: 'Группа создана',
            time: formatTime(Date.now()),
            unread: 0,
            online: false,
            pinned: false,
            muted: false,
            archived: false,
            color: 'linear-gradient(135deg, #667eea, #764ba2)',
            isGroup: true
        };
        
        chats.unshift(newChat);
        messages[newChat.id] = [];
        
        closeModal('create-group-modal');
        renderChatList();
        selectChat(newChat.id);
        showNotification(`Группа "${name}" создана`, 'success');
        document.getElementById('group-name-input').value = '';
    } else {
        showNotification('Введите название группы', 'error');
    }
}

function blockUser() {
    if (confirm('Заблокировать этого пользователя?')) {
        if (currentChat) {
            blockedUsers.push(currentChat.id);
            localStorage.setItem('priconnecte_blocked', JSON.stringify(blockedUsers));
            showNotification('Пользователь заблокирован', 'success');
        }
    }
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.classList.toggle('hidden');
}

function renderEmojiPicker() {
    const emojis = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'],
        food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🥞', '🥖', '🥐', '🥨', '🥯', '🥪', '🌮'],
        symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝']
    };
    
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    emojis.smileys.forEach(emoji => {
        const el = document.createElement('span');
        el.className = 'emoji-item';
        el.textContent = emoji;
        el.onclick = () => insertEmoji(emoji);
        grid.appendChild(el);
    });
    
    document.querySelectorAll('.emoji-category').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.emoji-category').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.dataset.category;
            grid.innerHTML = '';
            emojis[category].forEach(emoji => {
                const el = document.createElement('span');
                el.className = 'emoji-item';
                el.textContent = emoji;
                el.onclick = () => insertEmoji(emoji);
                grid.appendChild(el);
            });
        };
    });
}

function insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    if (input) {
        input.value += emoji;
        toggleSendButton();
    }
}

// ==========================================
// НАСТРОЙКИ
// ==========================================
function loadTheme() {
    const saved = localStorage.getItem('priconnecte_theme');
    if (saved === 'dark' || saved === null) {
        document.body.setAttribute('data-theme', 'dark');
        isDarkTheme = true;
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.setAttribute('data-theme', isDarkTheme ? 'dark' : '');
    localStorage.setItem('priconnecte_theme', isDarkTheme ? 'dark' : 'light');
    
    if (currentUser) {
        currentUser.settings.theme = isDarkTheme ? 'dark' : 'light';
        localStorage.setItem('priconnecte_user', JSON.stringify(currentUser));
    }
    
    showNotification(isDarkTheme ? 'Тёмная тема включена 🌙' : 'Светлая тема включена ☀️', 'success');
}

function loadSettings() {
    const settings = localStorage.getItem('priconnecte_settings');
    if (settings) {
        const s = JSON.parse(settings);
        notificationSettings = s.notificationSettings || notificationSettings;
    }
}

function saveNotificationSettings() {
    notificationSettings = {
        sound: document.getElementById('notify-sound')?.checked || true,
        vibrate: document.getElementById('notify-vibrate')?.checked || true,
        desktop: true
    };
    
    localStorage.setItem('priconnecte_settings', JSON.stringify({ notificationSettings }));
    showNotification('Настройки сохранены', 'success');
}

function changeChatBackground() {
    const backgrounds = [
        'var(--bg-chat)',
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    ];
    
    const current = localStorage.getItem('priconnecte_chat_bg') || '0';
    const next = (parseInt(current) + 1) % backgrounds.length;
    localStorage.setItem('priconnecte_chat_bg', next.toString());
    
    document.querySelector('.messages-container').style.background = backgrounds[next];
    showNotification('Фон чата изменён', 'success');
}

function clearData() {
    if (confirm('Это удалит ВСЕ данные безвозвратно! Продолжить?')) {
        fetch(`/api/user/data/${currentUser.id}`, { method: 'DELETE' }).catch(() => {});
        localStorage.clear();
        location.reload();
    }
}

function exportData() {
    const data = {
        user: currentUser,
        chats: chats,
        messages: messages,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `priconnecte-backup-${Date.now()}.json`;
    a.click();
    showNotification('Данные экспортированы', 'success');
}

// ==========================================
// НОВЫЙ ЧАТ
// ==========================================
function renderNewChatContacts() {
    const container = document.getElementById('new-chat-contacts');
    if (!container) return;
    container.innerHTML = '';
    
    contacts.forEach(contact => {
        const el = document.createElement('div');
        el.className = 'contact-item';
        el.innerHTML = `
            <div class="avatar-gradient" style="background: ${contact.color}; width: 45px; height: 45px; font-size: 18px;">${contact.avatar}</div>
            <div class="chat-info">
                <h4>${escapeHtml(contact.name)}</h4>
                <p class="user-status">${contact.online ? '<i class="fas fa-circle online-dot"></i> онлайн' : 'офлайн'}</p>
            </div>
        `;
        el.onclick = () => selectContactForNewChat(contact.id, el);
        container.appendChild(el);
    });
}

function filterContactsForNewChat() {
    const query = document.getElementById('new-chat-search').value.toLowerCase();
    document.querySelectorAll('#new-chat-contacts .contact-item').forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

function selectContactForNewChat(contactId, element) {
    selectedContactId = contactId;
    document.querySelectorAll('#new-chat-contacts .contact-item').forEach(item => {
        item.style.background = '';
    });
    element.style.background = 'var(--active-color)';
    showNotification('Контакт выбран', 'success');
}

function createNewChat() {
    if (!selectedContactId) {
        showNotification('Выберите контакт', 'error');
        return;
    }
    
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact) {
        const newChat = {
            id: Date.now(),
            name: contact.name,
            avatar: contact.avatar,
            lastMessage: 'Чат создан',
            time: formatTime(Date.now()),
            unread: 0,
            online: contact.online,
            pinned: false,
            muted: false,
            archived: false,
            color: contact.color
        };
        
        chats.unshift(newChat);
        messages[newChat.id] = [];
        
        closeModal('new-chat-modal');
        renderChatList();
        selectChat(newChat.id);
        showNotification(`Чат с ${contact.name} создан`, 'success');
        selectedContactId = null;
    }
}

function renderContacts() {
    const container = document.getElementById('contacts-list');
    if (!container) return;
    container.innerHTML = '';
    
    contacts.forEach(contact => {
        const el = document.createElement('div');
        el.className = 'contact-item';
        el.innerHTML = `
            <div class="avatar-gradient" style="background: ${contact.color}; width: 45px; height: 45px; font-size: 18px;">${contact.avatar}</div>
            <div class="chat-info">
                <h4>${escapeHtml(contact.name)}</h4>
                <p class="user-status">${contact.online ? '<i class="fas fa-circle online-dot"></i> онлайн' : 'офлайн'}</p>
            </div>
        `;
        container.appendChild(el);
    });
}

function addContact() {
    const name = prompt('Имя контакта:');
    if (name) {
        const contact = {
            id: Date.now(),
            name: name,
            avatar: name.charAt(0).toUpperCase(),
            online: false,
            color: 'linear-gradient(135deg, #667eea, #764ba2)'
        };
        contacts.push(contact);
        renderContacts();
        renderNewChatContacts();
        showNotification('Контакт добавлен', 'success');
    }
}

// ==========================================
// ЗАГРУЗКА ФОТО
// ==========================================
function toggleAttachmentPanel() {
    document.getElementById('attachment-panel').classList.toggle('hidden');
}

function closeAttachmentPanel() {
    document.getElementById('attachment-panel').classList.add('hidden');
}

function triggerPhotoUpload() {
    document.getElementById('photo-upload').click();
    closeAttachmentPanel();
}

function triggerFileUpload() {
    document.getElementById('file-upload').click();
    closeAttachmentPanel();
}

function handlePhotoUpload(event) {
    const files = event.target.files;
    if (!files.length || !currentChat) return;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            
            if (!messages[currentChat.id]) messages[currentChat.id] = [];
            messages[currentChat.id].push({
                id: Date.now(),
                text: '📷 Фото',
                type: 'out',
                time: formatTime(Date.now()),
                read: false,
                file: { type: 'image', url: imageUrl, name: file.name }
            });
            
            addMessageToDOM('Фото', 'out', formatTime(Date.now()), false, {
                type: 'image', url: imageUrl, name: file.name
            });
            
            currentChat.lastMessage = '📷 Фото';
            currentChat.time = formatTime(Date.now());
            renderChatList();
            loadMessages(currentChat.id);
        };
        reader.readAsDataURL(file);
    });
    
    event.target.value = '';
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentChat) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        if (!messages[currentChat.id]) messages[currentChat.id] = [];
        messages[currentChat.id].push({
            id: Date.now(),
            text: file.name,
            type: 'out',
            time: formatTime(Date.now()),
            read: false,
            file: { type: 'file', url: e.target.result, name: file.name }
        });
        
        addMessageToDOM(file.name, 'out', formatTime(Date.now()), false, {
            type: 'file', url: e.target.result, name: file.name
        });
        
        currentChat.lastMessage = '📎 Файл';
        currentChat.time = formatTime(Date.now());
        renderChatList();
        loadMessages(currentChat.id);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// ==========================================
// УВЕДОМЛЕНИЯ
// ==========================================
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    
    notification.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showTypingIndicator(data) {
    if (data.chatId !== currentChat?.id) return;
    const indicator = document.getElementById('typing-indicator');
    const text = indicator.querySelector('.typing-text');
    
    if (data.isTyping) {
        text.textContent = `${data.username} печатает...`;
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

function updateMessageStatus(data) {
    document.querySelectorAll('.message.out').forEach(msg => {
        const meta = msg.querySelector('.message-meta');
        if (meta && !meta.querySelector('.fa-check-double')) {
            meta.innerHTML = meta.innerHTML.replace('fa-check', 'fa-check-double');
        }
    });
}

function updateUserStatus(data) {
    const chatItem = document.querySelector(`[data-chat-id="${data.userId}"]`);
    if (chatItem) {
        const dot = chatItem.querySelector('.status-dot');
        if (dot) dot.classList.toggle('online', data.status === 'online');
    }
}

function playNotificationSound() {
    // Простой звук уведомления
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// ==========================================
// ФУНКЦИИ ЧАТА
// ==========================================
function openChatMenu() {
    document.getElementById('chat-menu-popup').classList.toggle('hidden');
}

function pinChat() {
    if (currentChat) {
        currentChat.pinned = !currentChat.pinned;
        renderChatList();
        showNotification(currentChat.pinned ? 'Чат закреплён 📌' : 'Чат откреплён', 'success');
    }
}

function muteChat() {
    if (currentChat) {
        currentChat.muted = !currentChat.muted;
        renderChatList();
        showNotification(currentChat.muted ? 'Чат отключён 🔕' : 'Чат включён 🔔', 'success');
    }
}

function archiveChat() {
    if (currentChat) {
        currentChat.archived = !currentChat.archived;
        renderChatList();
        showNotification(currentChat.archived ? 'Чат архивирован 📦' : 'Чат разархивирован', 'success');
    }
}

function clearChatHistory() {
    if (confirm('Очистить историю чата?')) {
        messages[currentChat.id] = [];
        loadMessages(currentChat.id);
        showNotification('История очищена', 'success');
    }
}

function deleteChat() {
    if (confirm('Удалить этот чат?')) {
        chats = chats.filter(c => c.id !== currentChat.id);
        delete messages[currentChat.id];
        currentChat = null;
        renderChatList();
        document.getElementById('messages-box').innerHTML = '<div class="message date-divider"><span>Выберите чат</span></div>';
        showNotification('Чат удалён', 'success');
    }
}

function startCall(type) {
    showNotification(`${type === 'audio' ? '📞 Аудио' : '📹 Видео'} звонок...`, 'info');
}

function openSearchInChat() {
    showNotification('🔍 Поиск в чате', 'info');
}

function openLocationPicker() {
    showNotification('📍 Выбор геопозиции', 'info');
    closeAttachmentPanel();
}

function openContactPicker() {
    showNotification('👤 Выбор контакта', 'info');
    closeAttachmentPanel();
}

function startVoiceRecording() {
    showNotification('🎤 Запись голосового...', 'info');
    closeAttachmentPanel();
    setTimeout(() => showNotification('Голосовое отправлено', 'success'), 2000);
}

function startRecording() {
    const micBtn = document.getElementById('send-mic-toggle');
    if (micBtn) {
        micBtn.style.background = 'var(--danger-gradient)';
        micBtn.style.color = 'white';
    }
    showNotification('Запись... Отпустите для отправки', 'info');
}

function stopRecording() {
    const micBtn = document.getElementById('send-mic-toggle');
    if (micBtn) {
        micBtn.style.background = '';
        micBtn.style.color = '';
    }
    showNotification('Голосовое отправлено', 'success');
}

function viewImage(url) {
    showNotification('🖼️ Просмотр изображения', 'info');
}

function viewMedia(type) {
    showNotification(`📁 ${type}`, 'info');
}

function loadBlockedUsers() {
    const blocked = localStorage.getItem('priconnecte_blocked');
    if (blocked) blockedUsers = JSON.parse(blocked);
}

// ==========================================
// УТИЛИТЫ
// ==========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
    }
    
    const picker = document.getElementById('emoji-picker');
    const btn = document.querySelector('.emoji-btn');
    if (picker && !picker.contains(e.target) && btn && !btn.contains(e.target)) {
        picker.classList.add('hidden');
    }
    
    const chatMenu = document.getElementById('chat-menu-popup');
    if (chatMenu && !chatMenu.contains(e.target)) {
        chatMenu.classList.add('hidden');
    }
});
