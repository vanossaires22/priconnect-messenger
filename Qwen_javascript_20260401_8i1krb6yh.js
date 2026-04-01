/* ========================================== */
/* ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ                      */
/* ========================================== */
let currentUser = null;
let currentChat = null;
let messages = [];
let chats = [];
let isDarkTheme = false;
let is2FAEnabled = false;

/* ========================================== */
/* ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ                 */
/* ========================================== */
document.addEventListener('DOMContentLoaded', function() {
    // Проверка сохраненной темы
    const savedTheme = localStorage.getItem('priconnecte_theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        isDarkTheme = true;
        const themeSwitch = document.getElementById('theme-switch');
        if (themeSwitch) themeSwitch.checked = true;
    }
    
    // Проверка сохраненного пользователя
    const savedUser = localStorage.getItem('priconnecte_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }
    
    // Инициализация таймера кода
    startCodeTimer();
    
    // Генерация тестовых чатов
    generateTestChats();
    
    // Обработчики событий ввода
    setupInputHandlers();
});

/* ========================================== */
/* АУТЕНТИФИКАЦИЯ                             */
/* ========================================== */
function goToCodeStep() {
    const phoneInput = document.getElementById('phone-input');
    const phone = phoneInput.value.trim();
    
    if (phone.length < 10) {
        showNotification('Введите корректный номер телефона', 'error');
        return;
    }
    
    // Анимация перехода
    document.getElementById('auth-step-1').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('hidden');
    
    // Фокус на первое поле кода
    setTimeout(() => {
        document.querySelector('.code-digit').focus();
    }, 300);
    
    showNotification('Код отправлен', 'success');
}

function backToPhone() {
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('auth-step-1').classList.remove('hidden');
}

function moveToNext(input, index) {
    if (input.value.length === 1) {
        const nextInput = document.querySelectorAll('.code-digit')[index];
        if (nextInput) nextInput.focus();
    }
}

function finishLogin() {
    // Проверка кода (в реальном приложении - запрос к серверу)
    const codeInputs = document.querySelectorAll('.code-digit');
    let code = '';
    codeInputs.forEach(input => code += input.value);
    
    if (code.length !== 5) {
        showNotification('Введите 5-значный код', 'error');
        return;
    }
    
    // Создание пользователя
    const phone = document.getElementById('phone-input').value;
    currentUser = {
        id: Date.now(),
        phone: phone,
        username: 'User' + Math.floor(Math.random() * 1000),
        name: 'Пользователь',
        avatar: null
    };
    
    // Сохранение в localStorage
    localStorage.setItem('priconnecte_user', JSON.stringify(currentUser));
    
    // Обновление UI
    updateProfileUI();
    
    // Переход к основному приложению
    document.getElementById('auth-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('auth-screen').style.display = 'none';
        showMainApp();
    }, 500);
    
    showNotification('Добро пожаловать в Priconnecte!', 'success');
}

function showMainApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('main-app').style.display = 'flex';
    
    // Загрузка чатов
    renderChatList();
    
    // Выбор первого чата
    if (chats.length > 0) {
        selectChat(chats[0].id);
    }
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('priconnecte_user');
        location.reload();
    }
}

/* ========================================== */
/* УПРАВЛЕНИЕ ЧАТАМИ                          */
/* ========================================== */
function generateTestChats() {
    chats = [
        {
            id: 1,
            name: 'Павел Дуров',
            avatar: 'П',
            lastMessage: 'Как тебе новый дизайн Priconnecte?',
            time: '14:20',
            unread: 2,
            online: true,
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            id: 2,
            name: 'Команда разработки',
            avatar: 'К',
            lastMessage: 'Сервер перегружен, чиним...',
            time: '10:05',
            unread: 0,
            online: false,
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            id: 3,
            name: 'Дизайн команда',
            avatar: 'Д',
            lastMessage: 'Новые макеты готовы',
            time: 'Вчера',
            unread: 5,
            online: true,
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        {
            id: 4,
            name: 'Избранное',
            avatar: '★',
            lastMessage: 'Документация проекта.pdf',
            time: 'Пн',
            unread: 0,
            online: false,
            color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        },
        {
            id: 5,
            name: 'Мария Иванова',
            avatar: 'М',
            lastMessage: 'Спасибо за помощь!',
            time: 'Вс',
            unread: 1,
            online: true,
            color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
        }
    ];
}

function renderChatList() {
    const container = document.getElementById('chat-list-container');
    container.innerHTML = '';
    
    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';
        chatElement.dataset.chatId = chat.id;
        chatElement.onclick = () => selectChat(chat.id);
        
        chatElement.innerHTML = `
            <div class="avatar" style="background: ${chat.color}">
                ${chat.avatar}
                ${chat.online ? '<span class="status-dot online"></span>' : ''}
            </div>
            <div class="chat-info">
                <div class="chat-top">
                    <h4>${chat.name}</h4>
                    <span class="time">${chat.time}</span>
                </div>
                <div class="chat-bottom">
                    <p class="last-message">${chat.lastMessage}</p>
                    ${chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ''}
                </div>
            </div>
        `;
        
        container.appendChild(chatElement);
    });
}

function selectChat(chatId) {
    // Снятие активного класса со всех чатов
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Добавление активного класса выбранному чату
    const selectedChat = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (selectedChat) {
        selectedChat.classList.add('active');
    }
    
    // Поиск данных чата
    const chatData = chats.find(c => c.id === chatId);
    if (chatData) {
        currentChat = chatData;
        
        // Обновление заголовка
        document.getElementById('current-chat-name').textContent = chatData.name;
        document.getElementById('current-chat-initial').textContent = chatData.avatar;
        document.getElementById('current-chat-avatar').style.background = chatData.color;
        
        // Обновление статуса
        const statusText = chatData.online ? 'в сети' : 'был(а) недавно';
        document.getElementById('current-chat-status').textContent = statusText;
        
        // Обновление правой панели
        document.getElementById('info-panel-name').textContent = chatData.name;
        document.getElementById('info-panel-initial').textContent = chatData.avatar;
        
        // Очистка и загрузка сообщений
        loadMessages(chatId);
        
        // Сброс непрочитанных
        chatData.unread = 0;
        renderChatList();
    }
}

function loadMessages(chatId) {
    const container = document.getElementById('messages-box');
    container.innerHTML = '<div class="message date-divider">Сегодня</div>';
    
    // Тестовые сообщения
    const testMessages = [
        { text: 'Привет! Как дела?', type: 'in', time: '14:15' },
        { text: 'Привет! Всё отлично, работаю над новым проектом', type: 'out', time: '14:16' },
        { text: 'Как тебе новый дизайн Priconnecte?', type: 'in', time: '14:18' },
        { text: 'Выглядит отлично! Очень похоже на Telegram', type: 'out', time: '14:19', read: true }
    ];
    
    testMessages.forEach(msg => {
        addMessageToDOM(msg.text, msg.type, msg.time, msg.read);
    });
    
    scrollToBottom();
}

function addMessageToDOM(text, type, time, read = false) {
    const container = document.getElementById('messages-box');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const readIcon = read ? '<i class="fas fa-check-double message-read"></i>' : '<i class="fas fa-check message-read"></i>';
    
    messageDiv.innerHTML = `
        ${text}
        <span class="message-meta">
            ${time}
            ${type === 'out' ? readIcon : ''}
        </span>
    `;
    
    container.appendChild(messageDiv);
    scrollToBottom();
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Добавление сообщения в DOM
    const now = new Date();
    const time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    
    addMessageToDOM(text, 'out', time, false);
    
    // Очистка поля ввода
    input.value = '';
    toggleSendButton();
    
    // Обновление последнего сообщения в списке чатов
    if (currentChat) {
        currentChat.lastMessage = text;
        currentChat.time = time;
        renderChatList();
    }
    
    // Имитация ответа
    setTimeout(() => {
        const responses = [
            'Интересно!',
            'Понял, спасибо',
            'Хорошо, договорились',
            '👍',
            'Сейчас посмотрю'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessageToDOM(randomResponse, 'in', time);
        
        // Обновление статуса прочтения
        const lastOutMessage = document.querySelectorAll('.message.out').length - 1;
        const outMessages = document.querySelectorAll('.message.out');
        if (outMessages[lastOutMessage]) {
            const meta = outMessages[lastOutMessage].querySelector('.message-meta');
            if (meta) {
                meta.innerHTML = `${time} <i class="fas fa-check-double message-read"></i>`;
            }
        }
    }, 1000 + Math.random() * 2000);
}

function handleEnter(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function toggleSendButton() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('send-mic-toggle');
    
    if (input.value.trim().length > 0) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
    } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
    }
}

function scrollToBottom() {
    const container = document.getElementById('messages-box');
    container.scrollTop = container.scrollHeight;
}

function setupInputHandlers() {
    const input = document.getElementById('message-input');
    input.addEventListener('input', toggleSendButton);
    input.addEventListener('keypress', handleEnter);
}

/* ========================================== */
/* УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ                     */
/* ========================================== */
function toggleMenu() {
    const menu = document.getElementById('sidebar-menu');
    menu.classList.toggle('hidden');
}

function toggleInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel.classList.toggle('hidden');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    // Закрытие меню если открыто
    document.getElementById('sidebar-menu').classList.add('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

/* ========================================== */
/* ТЕМЫ ОФОРМЛЕНИЯ                            */
/* ========================================== */
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    
    if (isDarkTheme) {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('priconnecte_theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('priconnecte_theme', 'light');
    }
    
    // Обновление переключателя
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.checked = isDarkTheme;
    }
    
    showNotification(isDarkTheme ? 'Тёмная тема включена' : 'Светлая тема включена', 'success');
}

/* ========================================== */
/* БЕЗОПАСНОСТЬ И ПАРОЛИ                      */
/* ========================================== */
function toggle2FASetup() {
    const form = document.getElementById('2fa-setup-form');
    const btn = document.getElementById('2fa-toggle-btn');
    
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-minus"></i> Отмена';
    } else {
        form.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-plus"></i> Включить';
    }
}

function cancel2FA() {
    document.getElementById('2fa-setup-form').classList.add('hidden');
    document.getElementById('2fa-toggle-btn').innerHTML = '<i class="fas fa-plus"></i> Включить';
}

function save2FA() {
    const password = document.getElementById('2fa-password').value;
    const confirm = document.getElementById('2fa-confirm').value;
    const hint = document.getElementById('2fa-hint').value;
    const email = document.getElementById('2fa-email').value;
    
    if (password.length < 6) {
        showNotification('Пароль должен быть минимум 6 символов', 'error');
        return;
    }
    
    if (password !== confirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    // Сохранение 2FA
    is2FAEnabled = true;
    localStorage.setItem('priconnecte_2fa', JSON.stringify({
        enabled: true,
        hint: hint,
        email: email
    }));
    
    document.getElementById('2fa-setup-form').classList.add('hidden');
    document.getElementById('2fa-toggle-btn').innerHTML = '<i class="fas fa-check"></i> Включено';
    document.getElementById('2fa-toggle-btn').disabled = true;
    
    showNotification('Двухэтапная аутентификация включена', 'success');
}

function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    strengthBar.className = 'strength-bar';
    
    if (strength <= 2) {
        strengthBar.classList.add('weak');
        strengthText.textContent = 'Слабый пароль';
        strengthText.style.color = 'var(--danger-color)';
    } else if (strength <= 4) {
        strengthBar.classList.add('medium');
        strengthText.textContent = 'Средний пароль';
        strengthText.style.color = 'var(--warning-color)';
    } else {
        strengthBar.classList.add('strong');
        strengthText.textContent = 'Надёжный пароль';
        strengthText.style.color = 'var(--success-color)';
    }
}

function terminateSession(button) {
    if (confirm('Завершить этот сеанс?')) {
        const sessionItem = button.closest('.session-item');
        sessionItem.style.opacity = '0';
        setTimeout(() => {
            sessionItem.remove();
        }, 300);
        showNotification('Сеанс завершён', 'success');
    }
}

function terminateAllSessions() {
    if (confirm('Завершить все сеансы кроме текущего?')) {
        const sessions = document.querySelectorAll('.session-item:not(.current)');
        sessions.forEach((session, index) => {
            setTimeout(() => {
                session.style.opacity = '0';
                setTimeout(() => session.remove(), 300);
            }, index * 100);
        });
        showNotification('Все сеансы завершены', 'success');
    }
}

function confirmDeleteAccount() {
    openModal('delete-confirm-modal');
}

function deleteAccount() {
    const code = document.getElementById('delete-confirm-code').value;
    
    if (code.length < 5) {
        showNotification('Введите код из SMS', 'error');
        return;
    }
    
    // Удаление аккаунта
    localStorage.clear();
    showNotification('Аккаунт удалён', 'success');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

function viewLoginHistory() {
    showNotification('История входов загружается...', 'success');
}

/* ========================================== */
/* ТАЙМЕР КОДА                                */
/* ========================================== */
function startCodeTimer() {
    let timeLeft = 59;
    const timerElement = document.getElementById('timer');
    
    if (!timerElement) return;
    
    const timer = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerElement.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            timerElement.textContent = '00:00';
        }
    }, 1000);
}

/* ========================================== */
/* УВЕДОМЛЕНИЯ                                */
/* ========================================== */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/* ========================================== */
/* ПОИСК ПО ЧАТАМ                             */
/* ========================================== */
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('chat-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const chatItems = document.querySelectorAll('.chat-item');
            
            chatItems.forEach(item => {
                const name = item.querySelector('h4').textContent.toLowerCase();
                const message = item.querySelector('.last-message').textContent.toLowerCase();
                
                if (name.includes(query) || message.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
});

/* ========================================== */
/* КОНСОЛЬ ДЛЯ ОТЛАДКИ                        */
/* ========================================== */
console.log('%c Priconnecte Messenger ', 'background: #3390ec; color: white; font-size: 20px; padding: 10px;');
console.log('%c Версия: 1.0.0 ', 'color: #707579; font-size: 12px;');
console.log('%c Разработано с ❤️ ', 'color: #3390ec; font-size: 12px;');