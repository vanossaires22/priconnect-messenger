// ============================================
// GlassMessenger PRO - Полный функционал
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // ==================== СОСТОЯНИЕ ====================
    const state = {
        currentUser: {
            id: 'user-1',
            name: 'Пользователь',
            avatar: 'https://i.pravatar.cc/150?img=68',
            status: 'Онлайн',
            customStatus: 'В сети'
        },
        contacts: [],
        chats: {},
        messages: {},
        currentChatId: null,
        pinnedChats: [],
        archivedChats: [],
        starredMessages: [],
        settings: {
            theme: 'dark',
            notifications: true,
            nightMode: false,
            sounds: true
        },
        editingMessageId: null,
        forwardingMessage: null,
        searchResults: [],
        searchIndex: 0,
        isRecording: false,
        recordingStartTime: null,
        mediaRecorder: null,
        audioChunks: []
    };

    // ==================== ЭЛЕМЕНТЫ DOM ====================
    const elements = {
        // Сайдбар
        sidebar: document.getElementById('sidebar'),
        contactsList: document.getElementById('contactsList'),
        searchInput: document.getElementById('searchInput'),
        tabs: document.querySelectorAll('.tab'),
        
        // Профиль
        userProfileBtn: document.getElementById('userProfileBtn'),
        userAvatar: document.getElementById('userAvatar'),
        userName: document.getElementById('userName'),
        userStatusText: document.getElementById('userStatusText'),
        
        // Чат
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        currentAvatar: document.getElementById('currentAvatar'),
        currentChatName: document.getElementById('currentChatName'),
        currentStatus: document.getElementById('currentStatus'),
        
        // Кнопки
        emojiBtn: document.getElementById('emojiBtn'),
        voiceBtn: document.getElementById('voiceBtn'),
        attachBtn: document.getElementById('attachBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        newChatBtn: document.getElementById('newChatBtn'),
        addContactBtn: document.getElementById('addContactBtn'),
        starredBtn: document.getElementById('starredBtn'),
        
        // Поиск в чате
        searchInChat: document.getElementById('searchInChat'),
        chatSearchBar: document.getElementById('chatSearchBar'),
        chatSearchInput: document.getElementById('chatSearchInput'),
        searchCount: document.getElementById('searchCount'),
        searchPrev: document.getElementById('searchPrev'),
        searchNext: document.getElementById('searchNext'),
        closeChatSearch: document.getElementById('closeChatSearch'),
        
        // Модальные окна
        profileModal: document.getElementById('profileModal'),
        newChatModal: document.getElementById('newChatModal'),
        addContactModal: document.getElementById('addContactModal'),
        editMessageModal: document.getElementById('editMessageModal'),
        forwardModal: document.getElementById('forwardModal'),
        settingsModal: document.getElementById('settingsModal'),
        starredModal: document.getElementById('starredModal'),
        exportModal: document.getElementById('exportModal'),
        
        // Контекстные меню
        messageContextMenu: document.getElementById('messageContextMenu'),
        chatContextMenu: document.getElementById('chatContextMenu'),
        
        // Эмодзи
        emojiPicker: document.getElementById('emojiPicker'),
        emojiGrid: document.getElementById('emojiGrid'),
        closeEmoji: document.getElementById('closeEmoji'),
        
        // Голосовые
        voiceRecording: document.getElementById('voiceRecording'),
        recordingTime: document.getElementById('recordingTime'),
        stopRecording: document.getElementById('stopRecording'),
        
        // Мобильные
        openSidebar: document.getElementById('openSidebar'),
        closeSidebar: document.getElementById('closeSidebar')
    };

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    init();

    function init() {
        loadFromStorage();
        initSampleData();
        setupEventListeners();
        initEmojiPicker();
        applySettings();
        renderContacts();
        checkNightMode();
        requestNotificationPermission();
        
        // Сохранение каждые 5 секунд
        setInterval(saveToStorage, 5000);
    }

    // ==================== ХРАНЕНИЕ ДАННЫХ ====================
    function saveToStorage() {
        const data = {
            currentUser: state.currentUser,
            contacts: state.contacts,
            chats: state.chats,
            messages: state.messages,
            pinnedChats: state.pinnedChats,
            archivedChats: state.archivedChats,
            starredMessages: state.starredMessages,
            settings: state.settings
        };
        localStorage.setItem('messengerProData', JSON.stringify(data));
    }

    function loadFromStorage() {
        const data = localStorage.getItem('messengerProData');
        if (data) {
            const parsed = JSON.parse(data);
            Object.assign(state, parsed);
        }
    }

    // ==================== ТЕСТОВЫЕ ДАННЫЕ ====================
    function initSampleData() {
        if (state.contacts.length === 0) {
            state.contacts = [
                { id: 1, name: 'Анна Смирнова', avatar: 'https://i.pravatar.cc/150?img=32', username: '@anna', status: 'online', lastSeen: 'Сейчас' },
                { id: 2, name: 'Максим Дизайнер', avatar: 'https://i.pravatar.cc/150?img=11', username: '@max', status: 'online', lastSeen: 'Сейчас' },
                { id: 3, name: 'Поддержка', avatar: 'https://i.pravatar.cc/150?img=5', username: '@support', status: 'offline', lastSeen: '5 мин назад' },
                { id: 4, name: 'Илон Маск', avatar: 'https://i.pravatar.cc/150?img=60', username: '@elon', status: 'online', lastSeen: 'Сейчас' },
                { id: 5, name: 'Рабочий чат', avatar: 'https://i.pravatar.cc/150?img=8', username: '@work', status: 'online', lastSeen: 'Сейчас', isGroup: true }
            ];

            state.chats = {
                1: { id: 1, name: 'Анна Смирнова', avatar: 'https://i.pravatar.cc/150?img=32', unread: 2, pinned: false, archived: false, muted: false },
                2: { id: 2, name: 'Максим Дизайнер', avatar: 'https://i.pravatar.cc/150?img=11', unread: 0, pinned: true, archived: false, muted: false },
                3: { id: 3, name: 'Поддержка', avatar: 'https://i.pravatar.cc/150?img=5', unread: 0, pinned: false, archived: true, muted: false },
                4: { id: 4, name: 'Илон Маск', avatar: 'https://i.pravatar.cc/150?img=60', unread: 1, pinned: false, archived: false, muted: false },
                5: { id: 5, name: 'Рабочий чат', avatar: 'https://i.pravatar.cc/150?img=8', unread: 5, pinned: false, archived: false, muted: true, isGroup: true }
            };

            state.messages = {
                1: [
                    { id: 1, text: 'Привет! Как дела?', type: 'incoming', time: '10:30', date: new Date().toISOString() },
                    { id: 2, text: 'Привет, всё отлично!', type: 'outgoing', time: '10:31', date: new Date().toISOString() },
                    { id: 3, text: 'Завтра встречаемся?', type: 'incoming', time: '10:32', date: new Date().toISOString(), starred: true }
                ],
                2: [
                    { id: 1, text: 'Скинул макеты на почту', type: 'incoming', time: '09:15', date: new Date().toISOString() },
                    { id: 2, text: 'Смотрю, спасибо!', type: 'outgoing', time: '09:20', date: new Date().toISOString() }
                ],
                4: [
                    { id: 1, text: 'Полетим на Марс в следующем году?', type: 'incoming', time: 'Вчера', date: new Date().toISOString() }
                ]
            };
        }
    }

    // ==================== СОБЫТИЯ ====================
    function setupEventListeners() {
        // Отправка сообщений
        elements.sendBtn.addEventListener('click', sendMessage);
        elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Профиль
        elements.userProfileBtn.addEventListener('click', () => openModal('profileModal'));
        document.getElementById('closeProfile').addEventListener('click', () => closeModal('profileModal'));
        document.getElementById('saveProfile').addEventListener('click', saveProfile);
        document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload);

        // Новые чаты и контакты
        elements.newChatBtn.addEventListener('click', () => openModal('newChatModal'));
        document.getElementById('closeNewChat').addEventListener('click', () => closeModal('newChatModal'));
        document.getElementById('createChat').addEventListener('click', createNewChat);

        elements.addContactBtn.addEventListener('click', () => openModal('addContactModal'));
        document.getElementById('closeAddContact').addEventListener('click', () => closeModal('addContactModal'));
        document.getElementById('addContact').addEventListener('click', addNewContact);

        // Редактирование сообщения
        document.getElementById('closeEditMessage').addEventListener('click', () => closeModal('editMessageModal'));
        document.getElementById('saveEditMessage').addEventListener('click', saveEditedMessage);

        // Пересылка
        document.getElementById('closeForward').addEventListener('click', () => closeModal('forwardModal'));
        document.getElementById('confirmForward').addEventListener('click', confirmForward);

        // Настройки
        elements.settingsBtn.addEventListener('click', () => openModal('settingsModal'));
        document.getElementById('closeSettings').addEventListener('click', () => closeModal('settingsModal'));
        document.getElementById('themeSelect').addEventListener('change', (e) => changeTheme(e.target.value));
        document.getElementById('notificationsToggle').addEventListener('change', (e) => toggleSetting('notifications', e.target.checked));
        document.getElementById('nightModeToggle').addEventListener('change', (e) => toggleSetting('nightMode', e.target.checked));
        document.getElementById('soundsToggle').addEventListener('change', (e) => toggleSetting('sounds', e.target.checked));

        // Избранное
        elements.starredBtn.addEventListener('click', showStarredMessages);
        document.getElementById('closeStarred').addEventListener('click', () => closeModal('starredModal'));

        // Экспорт
        document.getElementById('closeExport').addEventListener('click', () => closeModal('exportModal'));
        document.querySelectorAll('.btn-option').forEach(btn => {
            btn.addEventListener('click', () => exportChat(btn.dataset.format));
        });

        // Эмодзи
        elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
        elements.closeEmoji.addEventListener('click', () => elements.emojiPicker.classList.remove('active'));

        // Голосовые сообщения
        elements.voiceBtn.addEventListener('mousedown', startRecording);
        elements.voiceBtn.addEventListener('mouseup', stopRecording);
        elements.voiceBtn.addEventListener('mouseleave', stopRecording);
        elements.stopRecording.addEventListener('click', stopRecording);

        // Поиск в чате
        elements.searchInChat.addEventListener('click', () => {
            elements.chatSearchBar.classList.add('active');
            elements.chatSearchInput.focus();
        });
        elements.chatSearchInput.addEventListener('input', searchInChatMessages);
        elements.searchPrev.addEventListener('click', navigateSearchResults);
        elements.searchNext.addEventListener('click', () => navigateSearchResults(1));
        elements.closeChatSearch.addEventListener('click', () => {
            elements.chatSearchBar.classList.remove('active');
            clearSearchHighlights();
        });

        // Поиск контактов
        elements.searchInput.addEventListener('input', filterContacts);

        // Табы
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                elements.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                filterContactsByTab(tab.dataset.tab);
            });
        });

        // Контекстные меню
        document.addEventListener('click', (e) => {
            elements.messageContextMenu.classList.remove('active');
            elements.chatContextMenu.classList.remove('active');
        });

        elements.messageContextMenu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', (e) => handleContextMenuAction(e.target.dataset.action));
        });

        // Мобильное меню
        elements.openSidebar.addEventListener('click', () => elements.sidebar.classList.add('active'));
        document.getElementById('closeSidebar')?.addEventListener('click', () => elements.sidebar.classList.remove('active'));

        // Закрытие модальных окон по клику вне
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }

    // ==================== КОНТАКТЫ ====================
    function renderContacts(filter = 'all') {
        elements.contactsList.innerHTML = '';
        
        const chatIds = Object.keys(state.chats);
        let filteredIds = chatIds;

        if (filter === 'pinned') {
            filteredIds = chatIds.filter(id => state.chats[id].pinned);
        } else if (filter === 'archived') {
            filteredIds = chatIds.filter(id => state.chats[id].archived);
        } else if (filter === 'unread') {
            filteredIds = chatIds.filter(id => state.chats[id].unread > 0);
        }

        // Закреплённые всегда сверху
        const pinned = filteredIds.filter(id => state.chats[id].pinned);
        const others = filteredIds.filter(id => !state.chats[id].pinned);
        const sortedIds = [...pinned, ...others];

        sortedIds.forEach(chatId => {
            const chat = state.chats[chatId];
            const contact = state.contacts.find(c => c.id == chatId);
            if (!contact) return;

            const messages = state.messages[chatId] || [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

            const item = document.createElement('div');
            item.className = `contact-item ${state.currentChatId == chatId ? 'active' : ''} ${chat.pinned ? 'pinned' : ''} ${chat.archived ? 'archived' : ''}`;
            item.innerHTML = `
                <img src="${contact.avatar}" alt="${contact.name}">
                ${contact.status === 'online' ? '<span class="online-indicator"></span>' : ''}
                <div class="contact-info">
                    <h4>
                        ${contact.name}
                        ${chat.pinned ? '<i class="ri-pushpin-fill" style="color: var(--primary-color); font-size: 0.8rem;"></i>' : ''}
                    </h4>
                    <div class="contact-meta">
                        <p>${lastMessage ? (lastMessage.type === 'voice' ? '🎤 Голосовое' : lastMessage.text) : 'Нет сообщений'}</p>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="message-time">${lastMessage ? lastMessage.time : ''}</span>
                            ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => selectChat(chatId));
            item.addEventListener('contextmenu', (e) => showChatContextMenu(e, chatId));
            elements.contactsList.appendChild(item);
        });
    }

    function filterContacts() {
        const query = elements.searchInput.value.toLowerCase();
        const items = elements.contactsList.querySelectorAll('.contact-item');
        
        items.forEach(item => {
            const name = item.querySelector('h4').textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    }

    function filterContactsByTab(tab) {
        renderContacts(tab);
    }

    function selectChat(chatId) {
        state.currentChatId = chatId;
        const chat = state.chats[chatId];
        const contact = state.contacts.find(c => c.id == chatId);

        if (contact) {
            elements.currentChatName.textContent = contact.name;
            elements.currentAvatar.src = contact.avatar;
            elements.currentStatus.textContent = contact.status === 'online' ? 'Онлайн' : contact.lastSeen;
        }

        // Сброс непрочитанных
        if (chat.unread > 0) {
            chat.unread = 0;
            saveToStorage();
        }

        renderContacts();
        renderMessages();
        
        if (window.innerWidth <= 768) {
            elements.sidebar.classList.remove('active');
        }

        elements.messageInput.focus();
    }

    // ==================== СООБЩЕНИЯ ====================
    function renderMessages() {
        elements.messagesContainer.innerHTML = '';

        if (!state.currentChatId) {
            elements.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <i class="ri-chat-smile-2-line"></i>
                    <p>Выберите контакт, чтобы начать общение</p>
                </div>`;
            return;
        }

        const messages = state.messages[state.currentChatId] || [];

        messages.forEach(msg => {
            appendMessageToDOM(msg);
        });

        scrollToBottom();
    }

    function appendMessageToDOM(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.type} ${msg.edited ? 'edited' : ''} ${msg.starred ? 'message-starred' : ''}`;
        div.dataset.id = msg.id;

        let content = msg.text;

        // Предпросмотр ссылок
        if (msg.text.match(/https?:\/\/[^\s]+/)) {
            content = createLinkPreview(msg.text);
        }

        // Голосовое сообщение
        if (msg.type === 'voice') {
            content = createAudioMessage(msg);
        }

        div.innerHTML = `
            <div class="message-header">
                ${msg.sender ? `<span class="message-sender">${msg.sender}</span>` : ''}
                <span class="message-time">${msg.time}</span>
            </div>
            ${content}
            ${msg.starred ? '<i class="ri-star-fill" style="position: absolute; top: 10px; right: 10px; color: var(--warning);"></i>' : ''}
            <div class="message-actions">
                <button class="message-action-btn" data-action="reply"><i class="ri-reply-line"></i></button>
                <button class="message-action-btn" data-action="edit"><i class="ri-edit-line"></i></button>
                <button class="message-action-btn" data-action="forward"><i class="ri-forward-line"></i></button>
                <button class="message-action-btn" data-action="star"><i class="ri-star-${msg.starred ? 'fill' : 'line'}"></i></button>
                <button class="message-action-btn" data-action="delete"><i class="ri-delete-bin-line"></i></button>
            </div>
        `;

        // События для кнопок
        div.querySelectorAll('.message-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleMessageAction(btn.dataset.action, msg.id);
            });
        });

        // Контекстное меню
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, msg);
        });

        elements.messagesContainer.appendChild(div);
    }

    function sendMessage() {
        const text = elements.messageInput.value.trim();
        if (!text || !state.currentChatId) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msg = {
            id: Date.now(),
            text,
            type: 'outgoing',
            time,
            date: new Date().toISOString(),
            edited: false,
            starred: false
        };

        if (!state.messages[state.currentChatId]) {
            state.messages[state.currentChatId] = [];
        }
        state.messages[state.currentChatId].push(msg);

        appendMessageToDOM(msg);
        saveToStorage();
        renderContacts();
        elements.messageInput.value = '';
        scrollToBottom();

        // Уведомление (если это не наш чат)
        if (state.settings.notifications) {
            simulateBotResponse();
        }
    }

    function handleMessageAction(action, messageId) {
        const messages = state.messages[state.currentChatId];
        const msg = messages.find(m => m.id === messageId);

        switch (action) {
            case 'edit':
                openEditMessage(msg);
                break;
            case 'delete':
                deleteMessage(messageId);
                break;
            case 'star':
                toggleStarred(msg);
                break;
            case 'forward':
                openForwardModal(msg);
                break;
            case 'reply':
                elements.messageInput.value = `> ${msg.text}\n`;
                elements.messageInput.focus();
                break;
        }
        elements.messageContextMenu.classList.remove('active');
    }

    function deleteMessage(messageId) {
        if (!confirm('Удалить сообщение?')) return;
        
        const messages = state.messages[state.currentChatId];
        const index = messages.findIndex(m => m.id === messageId);
        if (index > -1) {
            messages.splice(index, 1);
            saveToStorage();
            renderMessages();
            renderContacts();
        }
    }

    function toggleStarred(msg) {
        msg.starred = !msg.starred;
        
        if (msg.starred) {
            state.starredMessages.push({
                ...msg,
                chatId: state.currentChatId,
                chatName: state.chats[state.currentChatId].name
            });
        } else {
            state.starredMessages = state.starredMessages.filter(m => m.id !== msg.id);
        }

        saveToStorage();
        renderMessages();
        showNotification(msg.starred ? 'Добавлено в избранное' : 'Удалено из избранного');
    }

    function showStarredMessages() {
        const list = document.getElementById('starredList');
        list.innerHTML = '';

        if (state.starredMessages.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Нет избранных сообщений</p>';
        } else {
            state.starredMessages.forEach(msg => {
                const item = document.createElement('div');
                item.className = 'starred-item';
                item.innerHTML = `
                    <div class="starred-item-header">
                        <span>${msg.chatName}</span>
                        <span>${msg.time}</span>
                    </div>
                    <p>${msg.text}</p>
                `;
                item.addEventListener('click', () => {
                    selectChat(msg.chatId);
                    closeModal('starredModal');
                });
                list.appendChild(item);
            });
        }

        openModal('starredModal');
    }

    // ==================== РЕДАКТИРОВАНИЕ ====================
    function openEditMessage(msg) {
        state.editingMessageId = msg.id;
        document.getElementById('editMessageText').value = msg.text;
        openModal('editMessageModal');
    }

    function saveEditedMessage() {
        const text = document.getElementById('editMessageText').value.trim();
        if (!text || !state.editingMessageId) return;

        const messages = state.messages[state.currentChatId];
        const msg = messages.find(m => m.id === state.editingMessageId);
        
        if (msg) {
            msg.text = text;
            msg.edited = true;
            saveToStorage();
            renderMessages();
            closeModal('editMessageModal');
        }
    }

    // ==================== ПЕРЕСЫЛКА ====================
    function openForwardModal(msg) {
        state.forwardingMessage = msg;
        const container = document.getElementById('forwardContacts');
        container.innerHTML = '';

        Object.keys(state.chats).forEach(chatId => {
            if (chatId != state.currentChatId) {
                const chat = state.chats[chatId];
                const option = document.createElement('div');
                option.className = 'contact-option';
                option.innerHTML = `
                    <img src="${chat.avatar}" alt="${chat.name}">
                    <span>${chat.name}</span>
                `;
                option.addEventListener('click', () => {
                    option.classList.toggle('selected');
                    option.dataset.selected = option.classList.contains('selected');
                });
                container.appendChild(option);
            }
        });

        openModal('forwardModal');
    }

    function confirmForward() {
        const selected = document.querySelectorAll('.contact-option.selected');
        if (!state.forwardingMessage || selected.length === 0) return;

        selected.forEach(option => {
            const chatId = parseInt(option.querySelector('img').alt); // Упрощённо
            // В реальной реализации нужно хранить ID
        });

        showNotification(`Переслано в ${selected.length} чат(ов)`);
        closeModal('forwardModal');
    }

    // ==================== ГОЛОСОВЫЕ СООБЩЕНИЯ ====================
    async function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showNotification('Запись голоса не поддерживается', 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];
            state.isRecording = true;
            state.recordingStartTime = Date.now();

            state.mediaRecorder.ondataavailable = (e) => {
                state.audioChunks.push(e.data);
            };

            state.mediaRecorder.start();
            elements.voiceRecording.classList.add('active');
            updateRecordingTime();
            state.recordingInterval = setInterval(updateRecordingTime, 1000);
        } catch (err) {
            showNotification('Нет доступа к микрофону', 'error');
        }
    }

    function stopRecording() {
        if (!state.isRecording) return;

        state.isRecording = false;
        clearInterval(state.recordingInterval);
        elements.voiceRecording.classList.remove('active');

        if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
            state.mediaRecorder.stop();
            state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        // Создаём аудио сообщение
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = Math.floor((Date.now() - state.recordingStartTime) / 1000);

        const msg = {
            id: Date.now(),
            type: 'voice',
            audioUrl,
            duration,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString()
        };

        if (!state.messages[state.currentChatId]) {
            state.messages[state.currentChatId] = [];
        }
        state.messages[state.currentChatId].push(msg);

        appendMessageToDOM(msg);
        saveToStorage();
        renderContacts();
        scrollToBottom();
    }

    function updateRecordingTime() {
        const seconds = Math.floor((Date.now() - state.recordingStartTime) / 1000);
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        elements.recordingTime.textContent = `${mins}:${secs}`;
    }

    function createAudioMessage(msg) {
        const bars = Math.min(30, Math.max(10, msg.duration));
        let waveform = '';
        for (let i = 0; i < bars; i++) {
            const height = Math.random() * 20 + 5;
            waveform += `<div class="wave-bar" style="height: ${height}px;"></div>`;
        }

        return `
            <div class="audio-message">
                <button class="audio-play-btn" onclick="playAudio('${msg.audioUrl}')">
                    <i class="ri-play-fill"></i>
                </button>
                <div class="audio-waveform">${waveform}</div>
                <span class="audio-duration">${formatDuration(msg.duration)}</span>
            </div>
        `;
    }

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ==================== ПОИСК В ЧАТЕ ====================
    function searchInChatMessages() {
        const query = elements.chatSearchInput.value.toLowerCase();
        if (!query || !state.currentChatId) {
            clearSearchHighlights();
            return;
        }

        const messages = state.messages[state.currentChatId] || [];
        state.searchResults = [];

        messages.forEach((msg, index) => {
            if (msg.text.toLowerCase().includes(query)) {
                state.searchResults.push(index);
            }
        });

        state.searchIndex = 0;
        elements.searchCount.textContent = state.searchResults.length > 0 
            ? `1 из ${state.searchResults.length}` 
            : '0 результатов';

        highlightSearchResults();
    }

    function navigateSearchResults(direction = 1) {
        if (state.searchResults.length === 0) return;

        state.searchIndex += direction;
        if (state.searchIndex >= state.searchResults.length) state.searchIndex = 0;
        if (state.searchIndex < 0) state.searchIndex = state.searchResults.length - 1;

        elements.searchCount.textContent = `${state.searchIndex + 1} из ${state.searchResults.length}`;
        highlightSearchResults();
    }

    function highlightSearchResults() {
        clearSearchHighlights();
        
        if (state.searchResults.length === 0) return;

        const messages = elements.messagesContainer.querySelectorAll('.message');
        const targetIndex = state.searchResults[state.searchIndex];
        
        if (messages[targetIndex]) {
            messages[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            messages[targetIndex].style.background = 'var(--warning)';
            setTimeout(() => {
                messages[targetIndex].style.background = '';
            }, 2000);
        }
    }

    function clearSearchHighlights() {
        elements.messagesContainer.querySelectorAll('.message').forEach(msg => {
            msg.style.background = '';
        });
    }

    // ==================== ПРОФИЛЬ ====================
    function saveProfile() {
        const nickname = document.getElementById('profileNickname').value.trim();
        const status = document.getElementById('profileStatus').value.trim();

        if (nickname) state.currentUser.name = nickname;
        if (status) state.currentUser.customStatus = status;

        elements.userName.textContent = state.currentUser.name;
        elements.userStatusText.textContent = state.currentUser.customStatus;

        saveToStorage();
        closeModal('profileModal');
        showNotification('Профиль сохранён');
    }

    function handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                state.currentUser.avatar = e.target.result;
                elements.userAvatar.src = e.target.result;
                document.getElementById('profileAvatarPreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // ==================== НОВЫЕ ЧАТЫ И КОНТАКТЫ ====================
    function createNewChat() {
        const name = document.getElementById('newChatName').value.trim();
        if (!name) return;

        const newId = Date.now();
        state.contacts.push({
            id: newId,
            name,
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            username: `@${name.toLowerCase().replace(/\s/g, '')}`,
            status: 'offline',
            lastSeen: 'Только что'
        });

        state.chats[newId] = {
            id: newId,
            name,
            avatar: state.contacts[state.contacts.length - 1].avatar,
            unread: 0,
            pinned: false,
            archived: false,
            muted: false
        };

        state.messages[newId] = [];
        saveToStorage();
        renderContacts();
        closeModal('newChatModal');
        document.getElementById('newChatName').value = '';
        showNotification('Чат создан');
    }

    function addNewContact() {
        const name = document.getElementById('contactName').value.trim();
        const username = document.getElementById('contactUsername').value.trim();
        if (!name) return;

        state.contacts.push({
            id: Date.now(),
            name,
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            username: username || `@${name.toLowerCase().replace(/\s/g, '')}`,
            status: 'offline',
            lastSeen: 'Только что'
        });

        saveToStorage();
        renderContacts();
        closeModal('addContactModal');
        document.getElementById('contactName').value = '';
        document.getElementById('contactUsername').value = '';
        showNotification('Контакт добавлен');
    }

    // ==================== НАСТРОЙКИ ====================
    function changeTheme(theme) {
        state.settings.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        saveToStorage();
    }

    function toggleSetting(key, value) {
        state.settings[key] = value;
        saveToStorage();
    }

    function applySettings() {
        document.documentElement.setAttribute('data-theme', state.settings.theme);
        document.getElementById('themeSelect').value = state.settings.theme;
        document.getElementById('notificationsToggle').checked = state.settings.notifications;
        document.getElementById('nightModeToggle').checked = state.settings.nightMode;
        document.getElementById('soundsToggle').checked = state.settings.sounds;
        
        elements.userName.textContent = state.currentUser.name;
        elements.userAvatar.src = state.currentUser.avatar;
        elements.userStatusText.textContent = state.currentUser.customStatus;
    }

    function checkNightMode() {
        if (state.settings.nightMode) {
            const hour = new Date().getHours();
            if (hour >= 20 || hour <= 6) {
                changeTheme('dark');
            }
        }
    }

    // ==================== ЭКСПОРТ ====================
    function exportChat(format) {
        if (!state.currentChatId) {
            showNotification('Выберите чат для экспорта', 'error');
            return;
        }

        const messages = state.messages[state.currentChatId] || [];
        const chat = state.chats[state.currentChatId];
        let content = '';

        if (format === 'txt') {
            content = `Чат: ${chat.name}\n${'='.repeat(50)}\n\n`;
            messages.forEach(msg => {
                content += `[${msg.time}] ${msg.type === 'outgoing' ? 'Вы' : chat.name}: ${msg.text}\n`;
            });
        } else if (format === 'json') {
            content = JSON.stringify({ chat, messages }, null, 2);
        } else if (format === 'html') {
            content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${chat.name}</title></head><body>`;
            content += `<h1>Чат: ${chat.name}</h1>`;
            messages.forEach(msg => {
                content += `<p><strong>[${msg.time}]</strong> ${msg.text}</p>`;
            });
            content += '</body></html>';
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${chat.name}-${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);

        closeModal('exportModal');
        showNotification('Чат экспортирован');
    }

    // ==================== УВЕДОМЛЕНИЯ ====================
    function requestNotificationPermission() {
        if ('Notification' in window && state.settings.notifications) {
            Notification.requestPermission();
        }
    }

    function showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <i class="ri-${type === 'error' ? 'error-warning' : 'check'}-line" style="color: ${type === 'error' ? 'var(--danger)' : 'var(--success)'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        // Браузерное уведомление
        if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('GlassMessenger', { body: message });
        }
    }

    // ==================== ЭМОДЗИ ====================
    function initEmojiPicker() {
        const emojis = ['😀', '😂', '😍', '🥰', '', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '✨', '💯', '', '💪', '🤝', '👋', '🎵'];
        
        emojis.forEach(emoji => {
            const item = document.createElement('span');
            item.className = 'emoji-item';
            item.textContent = emoji;
            item.addEventListener('click', () => {
                elements.messageInput.value += emoji;
                elements.messageInput.focus();
                elements.emojiPicker.classList.remove('active');
            });
            elements.emojiGrid.appendChild(item);
        });
    }

    function toggleEmojiPicker() {
        elements.emojiPicker.classList.toggle('active');
    }

    // ==================== КОНТЕКСТНЫЕ МЕНЮ ====================
    function showContextMenu(e, msg) {
        e.preventDefault();
        const menu = elements.messageContextMenu;
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.add('active');
        menu.dataset.messageId = msg.id;
    }

    function showChatContextMenu(e, chatId) {
        e.preventDefault();
        const menu = elements.chatContextMenu;
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.add('active');
        menu.dataset.chatId = chatId;
    }

    function handleContextMenuAction(action) {
        const menu = elements.messageContextMenu;
        const messageId = parseInt(menu.dataset.messageId);

        switch (action) {
            case 'edit':
                const msg = state.messages[state.currentChatId].find(m => m.id === messageId);
                if (msg) openEditMessage(msg);
                break;
            case 'delete':
                deleteMessage(messageId);
                break;
            case 'star':
                const starMsg = state.messages[state.currentChatId].find(m => m.id === messageId);
                if (starMsg) toggleStarred(starMsg);
                break;
        }
    }

    // ==================== УТИЛИТЫ ====================
    function openModal(id) {
        document.getElementById(id).classList.add('active');
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    function scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    function createLinkPreview(text) {
        const url = text.match(/https?:\/\/[^\s]+/)[0];
        return `
            ${text.replace(url, `<a href="${url}" target="_blank" style="color: var(--primary-color);">${url}</a>`)}
            <div class="link-preview">
                <div class="link-preview-info">
                    <div class="link-preview-title">Предпросмотр ссылки</div>
                    <div class="link-preview-url">${url}</div>
                </div>
            </div>
        `;
    }

    function simulateBotResponse() {
        setTimeout(() => {
            const responses = ['Интересно!', 'Понял тебя', 'Ага', 'Расскажи подробнее', '👍'];
            const msg = {
                id: Date.now(),
                text: responses[Math.floor(Math.random() * responses.length)],
                type: 'incoming',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toISOString()
            };

            state.messages[state.currentChatId].push(msg);
            appendMessageToDOM(msg);
            saveToStorage();
            renderContacts();
            scrollToBottom();
            showNotification('Новое сообщение');
        }, 2000);
    }

    // Глобальная функция для воспроизведения аудио
    window.playAudio = function(url) {
        const audio = new Audio(url);
        audio.play();
    };
});