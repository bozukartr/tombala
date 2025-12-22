// App State
const state = {
    user: null,
    currentScreen: 'login-screen',
    gameMode: 'free', // 'free' or 'betting'
    roomCode: null,
    isHost: false,
    players: [],
    card: [],
    drawnNumbers: [],
    lang: localStorage.getItem('gameLang') || 'tr'
};

const i18n = {
    tr: {
        modal_confirm_title: 'Onayla',
        modal_confirm_msg: 'Emin misiniz?',
        cancel: 'İptal',
        confirm: 'Onayla',
        select_lucky_card: 'Şanslı Kartını Seç',
        select_lucky_card_desc: 'Oynamak için 4 rastgele karttan birini seç.',
        regenerate_cards: 'Kartları Yenile',
        login_subtitle: 'Herkesin Çinkosu Kendine',
        google_login: 'Google ile Giriş Yap',
        guest_login: 'Misafir Olarak Oyna',
        select_game_mode: 'Oyun Modu Seç',
        choose_way_to_play: 'Nasıl oynayacağını seç ve kazan!',
        free_play: 'Ücretsiz',
        free_play_desc: 'Sadece Eğlence',
        betting: 'Bahisli',
        betting_desc: '50 Coin',
        or: 'VEYA',
        create_private_room: 'Oda Oluştur',
        room_code_placeholder: 'Oda Kodu',
        join: 'Katıl',
        room_id: 'ODA ID',
        waiting_for_players: 'Oyuncular bekleniyor...',
        game_will_begin_desc: 'Oyun yönetici başlattığında başlayacaktır.',
        start_game: 'OYUNU BAŞLAT',
        im_ready: 'HAZIRIM',
        waiting_for_host: 'Yöneticinin başlatması bekleniyor...',
        room_label: 'Oda:',
        my_card: 'KARTIM',
        opponents: 'RAKİPLER',
        game_over: 'Oyun Bitti',
        winner_label: 'Kazanan:',
        play_again: 'Tekrar Oyna',
        main_menu: 'Ana Menü',
        my_profile: 'Profilim',
        stats: 'İstatistik',
        shop: 'Mağaza',
        inventory: 'Envanter',
        total_coins: 'Toplam Coin',
        lucky_number: 'Şanslı Numara',
        most_marked_numbers: 'En Çok İşaretlenenler',
        customize_my_card: 'Kartımı Özelleştir',
        reset_stats: 'İstatistikleri Sıfırla',
        custom_card_editor: 'Kart Düzenleyici',
        clear: 'Temizle',
        save: 'Kaydet',
        editor_instructions: 'Kartını oluşturmak için tam 15 sayı (her satıra 5) seç.',
        // Toasts & Dynamic
        playing_as_guest: 'Misafir olarak oynanıyor',
        welcome_user: 'Hoş geldin {name}!',
        voice_enabled: 'Sesli duyurular açıldı',
        voice_muted: 'Ses kapandı',
        ready_toast: 'Hazırsın!',
        code_copied: 'Oda kodu kopyalandı!',
        leave_room_confirm: 'Odadan ayrılmak istiyor musunuz?',
        quit_game_confirm: 'Mevcut oyundan ayrılmak istediğinize emin misiniz?',
        exit_to_lobby_confirm: 'Ana menüye dönmek istediğinize emin misiniz? İlerlemeniz kaybolacaktır.',
        not_enough_coins: 'Yetersiz bakiye!',
        room_not_found: 'Oda bulunamadı',
        game_started: 'Oyun zaten başladı',
        room_full: 'Oda dolu',
        invalid_code: 'Geçersiz oda kodu',
        only_host_restart: 'Sadece yönetici yeniden başlatabilir',
        please_login: 'Lütfen önce giriş yapın',
        buy_theme_confirm: '{name} temasını {price} coine almak istiyor musunuz?',
        purchased_success: 'Başarıyla satın alındı!',
        theme_equipped: 'Tema kuşanıldı!',
        card_selection_title: 'Kart Seçimi',
        use_custom_card_msg: 'Bu oyun için kendi şanslı kartını kullanmak ister misin?',
        use_custom: 'Özel Kart',
        random_card: 'Rastgele',
        solo_play_msg: 'Tek başına mı? 3 yapay zeka rakip katıldı!',
        reset_stats_confirm: 'Bu işlem tüm işaretleme geçmişinizi silecektir. Devam edilsin mi?',
        stats_reset_toast: 'İstatistikler sıfırlandı.',
        profile_login_msg: 'Profil özelliklerine erişmek için lütfen Google ile giriş yapın.',
        max_15_numbers: 'En fazla 15 sayı seçebilirsiniz!',
        column_full: 'Sütun {num} dolu (en fazla 3 sayı)!',
        must_select_15: 'Tam olarak 15 sayı seçmelisiniz!',
        card_saved: 'Kart başarıyla kaydedildi!',
        selection_cleared: 'Seçimler temizlendi.',
        host_badge: 'Yönetici',
        waiting_dots: 'Bekleniyor...',
        start_match: 'MAÇI BAŞLAT',
        waiting_ready: 'HAZIR BEKLENİYOR',
        ready_exclaim: 'HAZIR!',
        buy_btn: 'Satın Al',
        equipped_badge: 'Kuşanıldı',
        equip_btn: 'Kuşan'
    },
    en: {
        modal_confirm_title: 'Confirm',
        modal_confirm_msg: 'Are you sure?',
        cancel: 'Cancel',
        confirm: 'Confirm',
        select_lucky_card: 'Select Your Lucky Card',
        select_lucky_card_desc: 'Choose one of the 4 random cards to play with.',
        regenerate_cards: 'Regenerate Cards',
        login_subtitle: 'Every Bingo is Unique',
        google_login: 'Sign in with Google',
        guest_login: 'Play as Guest',
        select_game_mode: 'Select Game Mode',
        choose_way_to_play: 'Choose your way to play & win!',
        free_play: 'Free Play',
        free_play_desc: 'Just for fun, no risk',
        betting: 'Betting',
        betting_desc: '50 Coins Entry • High Stakes',
        or: 'OR',
        create_private_room: 'Create Private Room',
        room_code_placeholder: 'Room Code',
        join: 'Join',
        room_id: 'ROOM ID',
        waiting_for_players: 'Waiting for players...',
        game_will_begin_desc: 'The game will begin when the host starts.',
        start_game: 'START GAME',
        im_ready: "I'M READY",
        waiting_for_host: 'Waiting for host to start...',
        room_label: 'Room:',
        my_card: 'MY CARD',
        opponents: 'OPPONENTS',
        game_over: 'Game Over',
        winner_label: 'Winner:',
        play_again: 'Play Again',
        main_menu: 'Main Menu',
        my_profile: 'My Profile',
        stats: 'Stats',
        shop: 'Shop',
        inventory: 'Inventory',
        total_coins: 'Total Coins',
        lucky_number: 'Lucky Number',
        most_marked_numbers: 'Most Marked Numbers',
        customize_my_card: 'Customize My Card',
        reset_stats: 'Reset Stats',
        custom_card_editor: 'Card Editor',
        clear: 'Clear',
        save: 'Save',
        editor_instructions: 'Select exactly 15 numbers (5 per row) to create your card.',
        // Toasts & Dynamic
        playing_as_guest: 'Playing as Guest',
        welcome_user: 'Welcome {name}!',
        voice_enabled: 'Voice announcements enabled',
        voice_muted: 'Voice muted',
        ready_toast: 'You are Ready!',
        code_copied: 'Room code copied!',
        leave_room_confirm: 'Do you want to leave this room?',
        quit_game_confirm: 'Are you sure you want to leave the current game?',
        exit_to_lobby_confirm: 'Are you sure you want to exit to the lobby? Your progress will be lost.',
        not_enough_coins: 'Not enough coins!',
        room_not_found: 'Room not found',
        game_started: 'Game already started',
        room_full: 'Room is full',
        invalid_code: 'Invalid Room Code',
        only_host_restart: 'Only host can restart',
        please_login: 'Please login first',
        buy_theme_confirm: 'Buy {name} for {price} coins?',
        purchased_success: 'Purchased successfully!',
        theme_equipped: 'Theme equipped!',
        card_selection_title: 'Card Selection',
        use_custom_card_msg: 'Use your custom lucky card for this game?',
        use_custom: 'Use Custom',
        random_card: 'Random Card',
        solo_play_msg: 'Solo Play? 3 AI Opponents joined!',
        reset_stats_confirm: 'This will delete all your marking history. Continue?',
        stats_reset_toast: 'Stats reset.',
        profile_login_msg: 'Please sign in with Google to access profile features.',
        max_15_numbers: 'Maximum 15 numbers allowed!',
        column_full: 'Column {num} is full (max 3 numbers)!',
        must_select_15: 'You must select exactly 15 numbers!',
        card_saved: 'Card saved successfully!',
        selection_cleared: 'Selection cleared.',
        host_badge: 'Host',
        waiting_dots: 'Waiting...',
        start_match: 'START MATCH',
        waiting_ready: 'WAITING READY',
        ready_exclaim: 'READY!',
        buy_btn: 'Buy',
        equipped_badge: 'Equipped',
        equip_btn: 'Equip'
    }
};

function getTxt(key, params = {}) {
    let text = i18n[state.lang][key] || key;
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

function updateLanguageUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = getTxt(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = getTxt(key);
    });

    // Update titles for icon buttons if they have them
    document.querySelectorAll('[title]').forEach(el => {
        // This is a bit manual but consistent
        if (el.id === 'open-profile-btn') el.title = getTxt('my_profile');
        if (el.id === 'logout-btn') el.title = getTxt('confirm'); // or Logout if key exists
        if (el.id === 'toggle-lang-btn') el.title = getTxt('confirm'); // Switch Language
    });

    const langEl = document.getElementById('current-lang');
    if (langEl) langEl.innerText = state.lang.toUpperCase();
}

// DOM Elements
const screens = document.querySelectorAll('.screen');
const loginBtn = document.getElementById('google-login-btn');
const guestBtn = document.getElementById('guest-login-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomCodeInput = document.getElementById('room-code-input');
const modeCards = document.querySelectorAll('.mode-card');

// Helper Utilities
function showToast(msg) {
    console.log('Toast:', msg);
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function showConfirmModal(title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel') {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;

    overlay.classList.remove('hidden');

    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    confirmBtn.innerText = confirmText;
    cancelBtn.innerText = cancelText;

    // Clean up old listeners
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (onConfirm) onConfirm();
    });

    newCancel.addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (onCancel) onCancel();
    });
}

function updateUserInfo() {
    const user = state.user || { displayName: 'Guest', photoURL: 'https://via.placeholder.com/40' };
    state.user = user;
    document.getElementById('user-name').innerText = user.displayName;
    const avatar = document.getElementById('user-avatar');
    avatar.src = user.photoURL;
    avatar.classList.remove('hidden');
}

// Voice Synthesis
let speechEnabled = localStorage.getItem('speechEnabled') !== 'false';
let turkishVoice = null;

// Warm-up voices
function initVoices() {
    const voices = window.speechSynthesis.getVoices();
    turkishVoice = voices.find(v => v.lang.includes('tr-TR') || v.lang.includes('tr_TR'));
}

if (window.speechSynthesis) {
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = initVoices;
    }
    initVoices();
}

// Voice Toggle Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateLanguageUI(); // Initial translation

    const langBtn = document.getElementById('toggle-lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            state.lang = state.lang === 'tr' ? 'en' : 'tr';
            localStorage.setItem('gameLang', state.lang);
            updateLanguageUI();
            initVoices(); // Refresh voice selection
            showToast(getTxt('confirm')); // Or just Lang changed toast
        });
    }

    const voiceBtn = document.getElementById('toggle-voice-btn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            speechEnabled = !speechEnabled;
            localStorage.setItem('speechEnabled', speechEnabled);

            const icon = voiceBtn.querySelector('i');
            if (speechEnabled) {
                voiceBtn.classList.remove('muted');
                icon.className = 'fas fa-volume-up';
                showToast(getTxt('voice_enabled'));
                speakNumber(state.lang === 'tr' ? 'Siz' : 'You'); // Small test
            } else {
                voiceBtn.classList.add('muted');
                icon.className = 'fas fa-volume-mute';
                showToast(getTxt('voice_muted'));
            }
        });
    }
});

// Mobile speech unlocker
let speechUnlocked = false;
function unlockSpeech() {
    if (speechUnlocked || !window.speechSynthesis) return;

    // Speak a silent utterance to unlock the context
    const silent = new SpeechSynthesisUtterance('');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    speechUnlocked = true;
    console.log('Speech synthesis unlocked');

    document.removeEventListener('click', unlockSpeech);
}
document.addEventListener('click', unlockSpeech);

function speakNumber(num) {
    if (!speechEnabled || !window.speechSynthesis) return;

    // Mobile check: If not unlocked yet, we can't speak
    if (!speechUnlocked) {
        unlockSpeech();
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(num.toString());
    utterance.lang = state.lang === 'tr' ? 'tr-TR' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Use cached voice or try finding it again
    if (!turkishVoice || state.lang === 'en') {
        const voices = window.speechSynthesis.getVoices();
        const targetLang = state.lang === 'tr' ? 'tr' : 'en';
        utterance.voice = voices.find(v => v.lang.toLowerCase().includes(targetLang));
    } else {
        utterance.voice = turkishVoice;
    }

    window.speechSynthesis.speak(utterance);
}

// Navigation
function showScreen(screenId) {
    screens.forEach(s => {
        s.classList.remove('active');
        setTimeout(() => {
            if (!s.classList.contains('active')) s.classList.add('hidden');
        }, 300);
    });

    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    // small delay to allow display:block to apply before opacity transition
    setTimeout(() => target.classList.add('active'), 10);
    state.currentScreen = screenId;

    // Update voice icon state when entering game screen
    if (screenId === 'game-screen') {
        const voiceBtn = document.getElementById('toggle-voice-btn');
        if (voiceBtn) {
            const icon = voiceBtn.querySelector('i');
            if (speechEnabled) {
                voiceBtn.classList.remove('muted');
                icon.className = 'fas fa-volume-up';
            } else {
                voiceBtn.classList.add('muted');
                icon.className = 'fas fa-volume-mute';
            }
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW error', err));
    }

    // Login logic
    guestBtn.addEventListener('click', () => {
        state.user = {
            uid: `guest_${Date.now()}`,
            displayName: `Guest_${Math.floor(Math.random() * 9000) + 1000}`,
            photoURL: `https://ui-avatars.com/api/?name=Guest&background=random`,
            isGuest: true
        };
        updateUserInfo();
        showScreen('lobby-screen');
        showToast(getTxt('playing_as_guest'));
    });
    loginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                // Sanitize user object
                state.user = {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    email: user.email,
                    isGuest: false
                };

                updateUserInfo();
                initProfile(state.user); // Initialize profile data from JS
                showScreen('lobby-screen');
                showToast(getTxt('welcome_user', { name: user.displayName }));
            }).catch(error => {
                console.error(error);
                showToast(error.message);
            });
    });

    // Mode Selection
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.gameMode = card.dataset.mode;
        });
    });

    // Room Actions
    createRoomBtn.addEventListener('click', async () => {
        console.log('Create Room clicked', state.user);
        if (!state.user) {
            showToast(getTxt('please_login'));
            return;
        }
        try {
            const code = Math.floor(10000 + Math.random() * 90000).toString();
            state.roomCode = code;
            state.isHost = true;

            console.log('Creating room in Realtime DB...', code);
            const roomRef = firebase.database().ref('rooms/' + code);

            await roomRef.set({
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                host: state.user.uid,
                status: 'waiting',
                players: [state.user],
                drawnNumbers: [0], // Initial dummy to avoid array issues or leave empty? RDB arrays are tricky.
                currentNumber: null,
                pot: state.gameMode === 'betting' ? 50 : 0
            });

            document.getElementById('display-room-code').innerText = code;

            // Reset local game state
            state.card = [];
            state.drawnNumbers = [];
            state.progress = {};
            state.claimsCount = 0;

            // IF user has custom card, ask to use it
            if (!state.user.isGuest && profileState.customCard && profileState.customCard.length === 15) {
                showConfirmModal(getTxt('card_selection_title'), getTxt('use_custom_card_msg'), () => {
                    state.card = distributeNumbersProfessionally(profileState.customCard);
                    showScreen('waiting-screen');
                    listenToRoom(code);
                }, () => {
                    // Random Card chosen
                    showCardPicker((selectedCard) => {
                        state.card = selectedCard;
                        showScreen('waiting-screen');
                        listenToRoom(code);
                    });
                }, getTxt('use_custom'), getTxt('random_card'));
            } else {
                // Not using custom or guest, show picker directly
                showCardPicker((selectedCard) => {
                    state.card = selectedCard;
                    showScreen('waiting-screen');
                    listenToRoom(code);
                });
            }
            console.log('Room created successfully');
        } catch (error) {
            console.error('Create Room Error:', error);
            showToast('Error: ' + error.message);
        }
    });

    joinRoomBtn.addEventListener('click', async () => {
        console.log('Join Room clicked', roomCodeInput.value);
        if (!state.user) {
            showToast(getTxt('please_login'));
            return;
        }
        const code = roomCodeInput.value;
        if (code.length === 5) {
            try {
                const roomRef = firebase.database().ref('rooms/' + code);
                const snapshot = await roomRef.once('value');

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (data.status !== 'waiting') {
                        showToast(getTxt('game_started'));
                        return;
                    }

                    // RDB doesn't have native ArrayUnion, we handle it manually
                    let players = data.players || [];
                    if (players.length >= 6) {
                        showToast(getTxt('room_full'));
                        return;
                    }

                    // Check if already in
                    if (players.some(p => p.uid === state.user.uid)) {
                        console.log('Player already in room');
                    } else {
                        players.push(state.user);
                    }

                    const joinBet = state.gameMode === 'betting' ? 50 : 0;

                    if (!state.user.isGuest && profileState.coins < joinBet) {
                        showToast(getTxt('not_enough_coins'));
                        return;
                    }

                    await roomRef.update({
                        players: players,
                        pot: (data.pot || 0) + joinBet
                    });

                    // Deduct coins if betting
                    if (!state.user.isGuest && joinBet > 0) {
                        firebase.database().ref(`users/${state.user.uid}/profile/coins`).set(profileState.coins - joinBet);
                    }

                    state.roomCode = code;
                    state.isHost = false;
                    document.getElementById('display-room-code').innerText = code;

                    // Reset local game state
                    state.card = [];
                    state.drawnNumbers = [];
                    state.progress = {};
                    state.claimsCount = 0;

                    // IF user has custom card, ask to use it
                    if (!state.user.isGuest && profileState.customCard && profileState.customCard.length === 15) {
                        showConfirmModal(getTxt('card_selection_title'), getTxt('use_custom_card_msg'), () => {
                            state.card = distributeNumbersProfessionally(profileState.customCard);
                            enterWaitingRoom(code);
                        }, () => {
                            showCardPicker((selectedCard) => {
                                state.card = selectedCard;
                                enterWaitingRoom(code);
                            });
                        }, getTxt('use_custom'), getTxt('random_card'));
                    } else {
                        showCardPicker((selectedCard) => {
                            state.card = selectedCard;
                            enterWaitingRoom(code);
                        });
                    }
                } else {
                    showToast(getTxt('room_not_found'));
                }
            } catch (error) {
                console.error('Join Room Error:', error);
                showToast('Error: ' + error.message);
            }
        } else {
            showToast(getTxt('invalid_code'));
        }
    });

    function enterWaitingRoom(code) {
        // Initialize ready state in Firebase
        firebase.database().ref(`rooms/${code}/playerData/${state.user.uid}`).update({
            isReady: false
        });
        showScreen('waiting-screen');
        listenToRoom(code);
    }

    document.getElementById('back-to-lobby').addEventListener('click', () => {
        showConfirmModal(getTxt('modal_confirm_title'), getTxt('leave_room_confirm'), () => {
            leaveRoom();
        }, null, getTxt('confirm'), getTxt('cancel'));
    });

    document.getElementById('start-game-btn').addEventListener('click', async () => {
        if (state.isHost) {
            try {
                const roomRef = firebase.database().ref('rooms/' + state.roomCode);
                const snapshot = await roomRef.once('value');
                const data = snapshot.val();
                let players = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

                if (players.length === 1) {
                    showToast(getTxt('solo_play_msg'));
                    const botNames = ['Bot Master 🤖', 'Lucky Tom 🍀', 'Bingo Pro 🎯'];
                    botNames.forEach((name, idx) => {
                        const botId = 'bot_' + (idx + 1);
                        const botCard = generateTombalaCard();
                        firebase.database().ref(`rooms/${state.roomCode}/playerData/${botId}`).set({
                            uid: botId,
                            displayName: name,
                            card: botCard,
                            progress: {},
                            claimsCount: 0,
                            isBot: true
                        });
                    });
                }

                await roomRef.update({
                    status: 'playing'
                });
            } catch (e) {
                console.error(e);
            }
        }
    });

    document.getElementById('ready-btn').addEventListener('click', () => {
        if (!state.roomCode || !state.user) return;

        const readyBtn = document.getElementById('ready-btn');
        const isCurrentlyReady = readyBtn.classList.contains('ready');
        const newReadyState = !isCurrentlyReady;

        firebase.database().ref(`rooms/${state.roomCode}/playerData/${state.user.uid}`).update({
            isReady: newReadyState
        });

        if (newReadyState) {
            if (navigator.vibrate) navigator.vibrate(30);
            showToast(getTxt('ready_toast'));
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            state.user = null;
            showScreen('login-screen');
            showToast(getTxt('confirm')); // Or Logout toast
        });
    });

    // Copy Code
    document.getElementById('copy-code-btn').addEventListener('click', () => {
        const code = document.getElementById('display-room-code').innerText;
        navigator.clipboard.writeText(code).then(() => {
            showToast(getTxt('code_copied'));
        });
    });

    // Leave Game
    document.getElementById('leave-game-btn').addEventListener('click', () => {
        showConfirmModal(getTxt('modal_confirm_title'), getTxt('quit_game_confirm'), () => {
            leaveRoom();
        }, null, getTxt('confirm'), getTxt('cancel'));
    });



    // Game Over Buttons
    document.getElementById('play-again-btn').addEventListener('click', async () => {
        if (!state.isHost) {
            showToast(getTxt('only_host_restart'));
            return;
        }

        const roomRef = firebase.database().ref('rooms/' + state.roomCode);
        const snapshot = await roomRef.once('value');
        const data = snapshot.val();

        const updates = {
            status: 'waiting',
            drawnNumbers: [0],
            currentNumber: null,
            winner: null
        };

        // Reset players' ready state and progress but KEEP THEIR CARDS
        if (data.playerData) {
            Object.keys(data.playerData).forEach(uid => {
                updates[`playerData/${uid}/isReady`] = false;
                updates[`playerData/${uid}/progress`] = {};
                updates[`playerData/${uid}/claimsCount`] = 0;
            });
        }

        await roomRef.update(updates);

        state.drawnNumbers = [];
        showScreen('waiting-screen');
    });

    document.getElementById('exit-to-lobby-btn').addEventListener('click', () => {
        showConfirmModal(getTxt('modal_confirm_title'), getTxt('exit_to_lobby_confirm'), () => {
            leaveRoom();
        }, null, getTxt('confirm'), getTxt('cancel'));
    });
});

// Listener for Room Updates
function listenToRoom(roomId) {
    firebase.database().ref('rooms/' + roomId)
        .on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Update Players List (Professional Slot System)
            const list = document.getElementById('waiting-player-list');
            list.innerHTML = '';

            const players = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

            // Create 6 slots
            for (let i = 0; i < 6; i++) {
                const p = players[i];
                const slot = document.createElement('div');
                slot.className = p ? (p.uid === data.host ? 'player-slot filled is-host' : 'player-slot filled') : 'player-slot';

                if (p) {
                    const isReady = data.playerData && data.playerData[p.uid] && data.playerData[p.uid].isReady;
                    if (isReady) slot.classList.add('is-ready');

                    slot.innerHTML = `
                        <div class="ready-indicator">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="slot-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="slot-info">
                            <span>${p.displayName || 'Guest'}</span>
                            ${p.uid === data.host ? `<div class="host-badge">${getTxt('host_badge')}</div>` : ''}
                        </div>
                    `;
                } else {
                    slot.innerHTML = `
                        <div class="slot-avatar">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="slot-info">
                            <span>${getTxt('waiting_dots')}</span>
                        </div>
                    `;
                }
                list.appendChild(slot);
            }

            document.getElementById('waiting-status').innerText = `${players.length}/6`;

            // Ready Button Logic & Host Start Button Visibility
            const startBtn = document.getElementById('start-game-btn');
            const readyBtn = document.getElementById('ready-btn');
            const waitMsg = document.querySelector('.host-waiting-msg');

            // Count ready players (excluding host)
            const otherPlayers = players.filter(p => p.uid !== data.host);
            const readyCount = otherPlayers.filter(p => data.playerData && data.playerData[p.uid] && data.playerData[p.uid].isReady).length;
            const allReady = otherPlayers.every(p => data.playerData && data.playerData[p.uid] && data.playerData[p.uid].isReady);

            if (state.isHost) {
                if (startBtn) {
                    startBtn.classList.remove('hidden');
                    startBtn.disabled = !allReady;
                    startBtn.innerHTML = allReady ? `<i class="fas fa-play"></i> ${getTxt('start_match')}` : `<i class="fas fa-clock"></i> ${getTxt('waiting_ready')} (${readyCount}/${otherPlayers.length})`;
                }
                if (readyBtn) readyBtn.classList.add('hidden');
                if (waitMsg) waitMsg.classList.add('hidden');
            } else {
                if (startBtn) startBtn.classList.add('hidden');
                if (readyBtn) {
                    readyBtn.classList.remove('hidden');
                    const myReady = data.playerData && data.playerData[state.user.uid] && data.playerData[state.user.uid].isReady;
                    if (myReady) {
                        readyBtn.classList.add('ready');
                        readyBtn.innerText = getTxt('ready_exclaim');
                    } else {
                        readyBtn.classList.remove('ready');
                        readyBtn.innerText = getTxt('im_ready');
                    }
                }
                if (waitMsg) waitMsg.classList.remove('hidden');
            }

            // Game Start Logic
            if (data.status === 'playing' && state.currentScreen !== 'game-screen') {
                showScreen('game-screen');

                // Update Room Code Display
                const codeEl = document.getElementById('game-room-code');
                if (codeEl) codeEl.innerText = state.roomCode;
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

                initBingoBoard();

                // Generate Card if not already set (e.g. random card)
                if (state.card.length === 0) {
                    state.card = generateTombalaCard();
                }

                // Always render the card when entering game screen
                renderCard(state.card, 'my-card');

                // Sync MY card to Firebase so others can see it
                syncMyCard();

                // If Host, start drawing loop (which updates Firebase)
                if (state.isHost) {
                    startGameLoop();
                }
            }

            // Sync Reset (Back to waiting screen)
            if (data.status === 'waiting' && state.currentScreen === 'game-over-screen') {
                state.drawnNumbers = [];
                showScreen('waiting-screen');
            }

            // Sync Game State (Drawn Numbers)
            const drawnNumbers = Array.isArray(data.drawnNumbers) ? data.drawnNumbers : Object.values(data.drawnNumbers || {});

            if (data.currentNumber && (!state.drawnNumbers.includes(data.currentNumber))) {
                state.drawnNumbers = drawnNumbers;
                updateGameUI(data.currentNumber);
                // Vibrate on new number
                if (navigator.vibrate) navigator.vibrate(50);
            }

            // Sync Pot
            const potDisplay = document.getElementById('game-pot');
            if (potDisplay) potDisplay.innerText = data.pot || 0;

            // Sync Opponent Cards (Full Size - Stable Update)
            const playerData = data.playerData || {};
            const opponentsContainer = document.getElementById('opponents-container');
            if (opponentsContainer) {
                const currentUids = Object.keys(playerData).filter(uid => {
                    if (state.user && uid === state.user.uid) return false;
                    const p = playerData[uid];
                    // Don't show players who don't have a card (left before game start)
                    if (data.status === 'playing' && (!p.card || p.card.length === 0)) return false;
                    return true;
                });

                // 1. Remove wrappers for players who left
                const existingWrappers = opponentsContainer.querySelectorAll('.opponent-card-wrapper');
                existingWrappers.forEach(wrap => {
                    const uid = wrap.dataset.uid;
                    if (!currentUids.includes(uid)) {
                        wrap.remove();
                    }
                });

                // 2. Update or Create wrappers
                currentUids.forEach(uid => {
                    const p = playerData[uid];
                    if (!p) return;

                    const cardGrid = p.card || [];
                    const progress = p.progress || {};
                    const claimsCount = p.claimsCount || 0;
                    const themeClass = p.themeClass || '';
                    const equippedTheme = p.equippedTheme || 'classic';

                    let wrapper = opponentsContainer.querySelector(`.opponent-card-wrapper[data-uid="${uid}"]`);

                    // Check if player is still in the room players list
                    const isActive = players.some(pl => pl.uid === uid);
                    const isBot = p.isBot === true;
                    // Bots are never "left". Humans are left if not active or explicitly marked.
                    const isLeft = !isBot && (p.hasLeft || !isActive);

                    if (!wrapper) {
                        wrapper = document.createElement('div');
                        wrapper.className = isLeft ? 'opponent-card-wrapper is-left' : 'opponent-card-wrapper';
                        wrapper.dataset.uid = uid;

                        wrapper.innerHTML = `
                            <div class="opponent-info">
                                <span class="opponent-name">${p.displayName || 'Guest'}</span>
                                <div class="opponent-stars" id="stars-${uid}"></div>
                            </div>
                            <div id="opp-card-${uid}" class="tombala-card ${themeClass}"></div>
                        `;
                        opponentsContainer.appendChild(wrapper);
                    }

                    // Dynamic class update for existing wrappers
                    if (isLeft) wrapper.classList.add('is-left');
                    else wrapper.classList.remove('is-left');

                    // Update Stars
                    const starsContainer = document.getElementById(`stars-${uid}`);
                    if (starsContainer) {
                        let starsHtml = '';
                        for (let i = 0; i < claimsCount; i++) {
                            starsHtml += '⭐';
                        }
                        if (starsContainer.innerHTML !== starsHtml) {
                            starsContainer.innerHTML = starsHtml;
                        }
                    }

                    // Update Card Content
                    renderCard(cardGrid, `opp-card-${uid}`, false, equippedTheme, progress);
                });
            }

            // Game Over Detection
            if (data.winner && state.currentScreen !== 'game-over-screen') {
                showGameOver(data.winner);
            }

            // Auto-Win Detection (Last player standing)
            if (data.status === 'playing' && players.length === 1 && !data.winner) {
                const hasBots = Object.values(data.playerData || {}).some(p => p.isBot);
                if (!hasBots) {
                    const lastPlayer = players[0];
                    if (state.isHost) {
                        firebase.database().ref('rooms/' + roomId).update({
                            winner: lastPlayer
                        });
                    }
                }
            }
        });
}

async function leaveRoom() {
    if (!state.roomCode || !state.user) {
        showScreen('lobby-screen');
        return;
    }

    const roomId = state.roomCode;
    const roomRef = firebase.database().ref('rooms/' + roomId);

    try {
        const snapshot = await roomRef.get();
        if (snapshot.exists()) {
            const data = snapshot.val();
            let players = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

            // Remove current user
            players = players.filter(p => p.uid !== state.user.uid);

            if (players.length === 0) {
                // Delete room if empty
                await roomRef.remove();
            } else {
                const updates = { players: players };
                // If host is leaving, assign new host
                if (data.host === state.user.uid) {
                    updates.host = players[0].uid;
                }

                // Explicitly mark as left in playerData
                updates[`playerData/${state.user.uid}/hasLeft`] = true;

                await roomRef.update(updates);
            }
        }
    } catch (e) {
        console.error('Error leaving room:', e);
    }

    roomRef.off();
    state.roomCode = null;
    state.isHost = false;
    state.card = [];
    state.drawnNumbers = [];
    showScreen('lobby-screen');
}

function showGameOver(winner) {
    const winnerDisplay = document.getElementById('winner-announcement').querySelector('span');
    if (winnerDisplay) winnerDisplay.innerText = winner.displayName;

    // If I am the winner, credit coins
    if (state.user && winner.uid === state.user.uid && !state.user.isGuest) {
        // Fetch current pot from firebase one last time or use local (risky if delayed)
        firebase.database().ref(`rooms/${state.roomCode}/pot`).once('value').then(snap => {
            const pot = snap.val() || 0;
            if (pot > 0) {
                const newTotal = profileState.coins + pot;
                firebase.database().ref(`users/${state.user.uid}/profile/coins`).set(newTotal);
                showToast(`You won ${pot} coins!`);
            }
        });
    }

    showScreen('game-over-screen');
}

function convertFlatToGridCard(flatNumbers) {
    if (!flatNumbers || flatNumbers.length !== 15) return generateTombalaCard();

    const colGroups = Array(9).fill(0).map(() => []);
    flatNumbers.forEach(n => {
        const c = Math.floor((n === 90 ? 89 : n) / 10);
        colGroups[c].push(n);
    });
    colGroups.forEach(g => g.sort((a, b) => a - b));

    const grid = Array(3).fill(0).map(() => Array(9).fill(0));
    const rowCounts = [0, 0, 0];

    function solve(colIdx, numInColIdx) {
        if (colIdx === 9) {
            return rowCounts.every(count => count === 5);
        }

        const group = colGroups[colIdx];
        if (numInColIdx === group.length) {
            return solve(colIdx + 1, 0);
        }

        const num = group[numInColIdx];
        let startRow = 0;
        if (numInColIdx > 0) {
            const prevNum = group[numInColIdx - 1];
            for (let r = 0; r < 3; r++) {
                if (grid[r][colIdx] === prevNum) {
                    startRow = r + 1;
                    break;
                }
            }
        }

        for (let r = startRow; r < 3; r++) {
            if (rowCounts[r] < 5) {
                grid[r][colIdx] = num;
                rowCounts[r]++;
                if (solve(colIdx, numInColIdx + 1)) return true;
                grid[r][colIdx] = 0;
                rowCounts[r]--;
            }
        }
        return false;
    }

    if (solve(0, 0)) return grid;
    return generateTombalaCard(); // Fallback if somehow selection invalid (shouldnt happen)
}

function syncMyCard() {
    if (state.roomCode && state.user) {
        const theme = MARKET_ITEMS.find(i => i.id === (profileState.equippedTheme || 'classic'));
        const themeClass = theme ? theme.themeClass : '';

        firebase.database().ref(`rooms/${state.roomCode}/playerData/${state.user.uid}`).update({
            uid: state.user.uid,
            displayName: state.user.displayName,
            card: state.card,
            progress: state.progress || {},
            claimsCount: state.claimsCount || 0,
            themeClass: themeClass,
            equippedTheme: profileState.equippedTheme || 'classic'
        });
    }
}

function startGameLoop() {
    // Only Host runs the draw loop logic
    if (!state.isHost) return;

    console.log('Starting draw loop (Host Only)');
    // Draw a number every 5 seconds (Slower)
    const interval = setInterval(async () => {
        // Stop if not host or game status changed or game over
        const snapshot = await firebase.database().ref('rooms/' + state.roomCode).once('value');
        const data = snapshot.val();

        if (!state.isHost || state.currentScreen !== 'game-screen' || (data && data.winner)) {
            clearInterval(interval);
            return;
        }

        if (state.drawnNumbers.length >= 90) {
            clearInterval(interval);
            showToast("Game Over!");
            return;
        }

        let num;
        do {
            num = Math.floor(Math.random() * 90) + 1;
        } while (state.drawnNumbers.includes(num));

        // Update Firebase
        try {
            const roomRef = firebase.database().ref('rooms/' + state.roomCode);
            const nextDrawn = [...state.drawnNumbers, num];

            await roomRef.update({
                currentNumber: num,
                drawnNumbers: nextDrawn
            });

            // Handle AI Progress (Host only)
            handleAIProgress(num, roomRef);

        } catch (e) {
            console.error("Error drawing number", e);
        }

    }, 5000);
}

async function handleAIProgress(num, roomRef) {
    const snapshot = await roomRef.once('value');
    const data = snapshot.val();
    const playerData = data.playerData || {};

    Object.keys(playerData).forEach(uid => {
        const p = playerData[uid];
        if (p.isBot) {
            // Check if bot has the number
            let hasNum = false;
            p.card.forEach(row => {
                if (row.includes(num)) hasNum = true;
            });

            if (hasNum) {
                const updates = {};
                updates[`playerData/${uid}/progress/${num}`] = true;

                // Recalculate claims for bot
                let rowsCompleted = 0;
                p.card.forEach(row => {
                    const nonNulls = row.filter(n => n !== null);
                    const markedInRow = nonNulls.filter(n => (p.progress && p.progress[n]) || n === num);
                    if (nonNulls.length > 0 && nonNulls.length === markedInRow.length) {
                        rowsCompleted++;
                    }
                });

                updates[`playerData/${uid}/claimsCount`] = rowsCompleted;

                if (rowsCompleted === 3) {
                    updates['winner'] = { uid: uid, displayName: p.displayName };
                }

                roomRef.update(updates);
            }
        }
    });
}

function updateGameUI(currentNum) {
    // Update main display
    const currentEl = document.getElementById('current-number');
    if (currentEl) currentEl.innerText = currentNum || '--';

    // Highlight on 90-Number Bingo Board
    if (currentNum > 0) {
        const cell = document.getElementById(`bingo-cell-${currentNum}`);
        if (cell) cell.classList.add('drawn');
    }

    // Comprehensive sync for drawn numbers (useful for people joining/refreshing)
    state.drawnNumbers.forEach(num => {
        if (num > 0) {
            const cell = document.getElementById(`bingo-cell-${num}`);
            if (cell) cell.classList.add('drawn');
        }
    });

    // Pulse animation for current number
    const circle = document.querySelector('.current-num-circle');
    if (circle) {
        circle.style.animation = 'none';
        circle.offsetHeight; // trigger reflow
        circle.style.animation = 'drawNum 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }

    // Voice Announcement
    speakNumber(currentNum);

    // Update History
    const historyContainer = document.getElementById('last-numbers-container');
    if (historyContainer) {
        historyContainer.innerHTML = '';
        const history = state.drawnNumbers.slice(-6, -1);
        history.reverse().forEach(num => {
            if (num <= 0) return;
            const span = document.createElement('div');
            span.className = 'history-num';
            span.innerText = num;
            historyContainer.appendChild(span);
        });
    }
}

function initBingoBoard() {
    const board = document.getElementById('bingo-board');
    if (!board) return;
    board.innerHTML = '';
    for (let i = 1; i <= 90; i++) {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.id = `bingo-cell-${i}`;
        cell.innerText = i;
        board.appendChild(cell);
    }

    // Catch-up if numbers were already drawn
    state.drawnNumbers.forEach(num => {
        if (num > 0) {
            const cell = document.getElementById(`bingo-cell-${num}`);
            if (cell) cell.classList.add('drawn');
        }
    });
}

// --- Game Logic ---

function generateTombalaCard() {
    // Tombala Card Rules:
    // 3 Rows, 9 Columns
    // 5 numbers per row (total 15 numbers)
    // Columns: 1-9, 10-19, 20-29, ... 80-90

    // Step 1: Initialize empty 3x9 grid
    let grid = Array(3).fill(null).map(() => Array(9).fill(0));

    // Step 2: Ensure every row has 5 numbers (placeholder count)
    // We need to place 15 numbers in total.
    // Each column must have at least 1 number? No strict rule, but usually yes.
    // Let's use a standard distribution approach.

    // Ranges for columns
    const getRange = (colIndex) => {
        if (colIndex === 0) return { min: 1, max: 9 };
        if (colIndex === 8) return { min: 80, max: 90 };
        return { min: colIndex * 10, max: (colIndex * 10) + 9 };
    }

    // Helper to get random unique numbers from a range
    const getNumbers = (count, range) => {
        const nums = new Set();
        while (nums.size < count) {
            nums.add(Math.floor(Math.random() * (range.max - range.min + 1)) + range.min);
        }
        return Array.from(nums).sort((a, b) => a - b);
    }

    // THIS IS A SIMPLIFIED ALGO
    // A robust one is complex because of constraints. 
    // We will use a randomized filling strategy that respects row limits.

    // 1. Fill each row with 5 unique column indices
    let rowColIndices = [];
    for (let r = 0; r < 3; r++) {
        let cols = new Set();
        while (cols.size < 5) {
            cols.add(Math.floor(Math.random() * 9));
        }
        rowColIndices.push(Array.from(cols).sort((a, b) => a - b));
    }

    // Correction: Ensure every column has at least one number? 
    // It's better for balance.
    // Let's count column usage
    let colCounts = Array(9).fill(0);
    rowColIndices.forEach(row => row.forEach(c => colCounts[c]++));

    // If any column is empty, swap an overloaded column index to the empty one
    // This is a naive repair, but sufficient for casual play
    for (let c = 0; c < 9; c++) {
        if (colCounts[c] === 0) {
            // Find a row with a "crowded" column (preferably logic is creating valid distribution first)
            // Re-generating is safer and easier than repairing.
            return generateTombalaCard(); // Recursive retry
        }
    }
    // Also max numbers per column check (optional but good, usually max 3)
    // Since only 3 rows, natural max is 3.

    // 2. Populate the grid with numbers
    // Track used numbers per column to ensure vertical uniqueness
    let colNumbers = Array(9).fill(null).map((_, i) => []);

    // Pre-calculate how many numbers each column needs total
    rowColIndices.forEach(row => row.forEach(c => {
        // Determine number count for this column so far
    }));

    // Actually, simpler: generate required count of numbers for each column first
    // Then distribute them to the rows that have this column marked.
    for (let c = 0; c < 9; c++) {
        let countInCol = colCounts[c];
        let range = getRange(c);
        let nums = getNumbers(countInCol, range);

        // Distribute these nums to the rows that have 'c'
        let rowIndex = 0;
        let numIndex = 0;
        while (rowIndex < 3 && numIndex < nums.length) {
            if (rowColIndices[rowIndex].includes(c)) {
                grid[rowIndex][c] = nums[numIndex++];
            }
            rowIndex++;
        }
    }

    return grid;
}

function showCardPicker(onSelected) {
    const overlay = document.getElementById('card-picker-overlay');
    const grid = document.getElementById('card-options-grid');
    const regenBtn = document.getElementById('regenerate-cards-btn');

    grid.innerHTML = '';
    overlay.classList.remove('hidden');

    const generateOptions = () => {
        grid.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const cardData = generateTombalaCard();
            const wrapper = document.createElement('div');
            wrapper.className = 'option-card-wrapper';
            wrapper.id = `picker-option-${i}`;

            const cardContainer = document.createElement('div');
            cardContainer.id = `picker-card-${i}`;
            cardContainer.className = 'tombala-card';

            wrapper.appendChild(cardContainer);
            grid.appendChild(wrapper);

            // Render preview (non-clickable, default theme)
            renderCard(cardData, `picker-card-${i}`, false);

            wrapper.onclick = () => {
                overlay.classList.add('hidden');
                regenBtn.onclick = null; // Clean up listener
                onSelected(cardData);
            };
        }
    };

    generateOptions();

    // Set up regeneration
    regenBtn.onclick = (e) => {
        e.stopPropagation();
        generateOptions();
        showToast('Cards Refreshed!');
    };
}

function renderCard(grid, containerId, canClick = true, themeToApply = null, progress = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Apply theme
    const themeId = themeToApply || profileState.equippedTheme || 'classic';
    const theme = MARKET_ITEMS.find(i => i.id === themeId);
    const themeClass = theme ? theme.themeClass : '';

    const targetClassName = `tombala-card ${themeClass}`.trim();
    if (container.className !== targetClassName) {
        container.className = targetClassName;
    }

    // To prevent total redraw if only progress changed, we can iterate cells
    // but for simplicity and 15 cells, a clean rebuild is fine AS LONG AS 
    // the parent wrapper doesn't re-animate.
    container.innerHTML = '';

    grid.forEach((row, rIdx) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'card-row';

        row.forEach((num, cIndex) => {
            const cell = document.createElement('div');
            const isMarked = num && progress && progress[num] === true;

            // Robust check for empty: null, undefined, 0, or false
            const isEmpty = (num === null || num === undefined || num === 0 || num === '');

            cell.className = isEmpty ? 'card-cell empty' : (isMarked ? 'card-cell marked' : 'card-cell');

            if (!isEmpty) {
                cell.innerText = num;
                cell.dataset.value = num;
                if (canClick) {
                    cell.addEventListener('click', onCellClick);
                }
            }
            rowDiv.appendChild(cell);
        });

        container.appendChild(rowDiv);
    });
}

function onCellClick(e) {
    const cell = e.target;
    const val = parseInt(cell.dataset.value);

    // 3. Check if number has been drawn
    if (!state.drawnNumbers.includes(val)) {
        showToast("Wait for this number!");
        return;
    }

    // 3. Mark the cell (No unmark allowed)
    if (cell.classList.contains('marked')) return;

    cell.classList.add('marked');
    if (navigator.vibrate) navigator.vibrate(30);

    // Track for stats
    trackMarkedNumber(val);

    // Sync progress to Firebase for opponents to see
    if (state.roomCode && state.user) {
        firebase.database().ref(`rooms/${state.roomCode}/playerData/${state.user.uid}/progress/${val}`).set(true);
    }

    checkClaims();
}

function checkClaims() {
    const cardDiv = document.getElementById('my-card');
    const rows = cardDiv.querySelectorAll('.card-row');
    let rowsCompleted = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('.card-cell:not(.empty)');
        const marked = row.querySelectorAll('.card-cell.marked');
        if (cells.length === marked.length && cells.length > 0) {
            rowsCompleted++;
            row.classList.add('completed');
        } else {
            row.classList.remove('completed');
        }
    });

    // Sync claim count to Firebase
    if (state.roomCode && state.user) {
        firebase.database().ref(`rooms/${state.roomCode}/playerData/${state.user.uid}`).update({
            claimsCount: rowsCompleted
        });

        // AUTO WIN: if 3 rows completed, update Firebase winner
        if (rowsCompleted === 3) {
            firebase.database().ref('rooms/' + state.roomCode).update({
                winner: state.user
            });
        }
    }
}


