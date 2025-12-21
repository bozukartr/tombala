// App State
const state = {
    user: null,
    currentScreen: 'login-screen',
    gameMode: 'free', // 'free' or 'betting'
    roomCode: null,
    isHost: false,
    players: [],
    card: [],
    drawnNumbers: []
};

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
let speechEnabled = true;
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
    utterance.lang = 'tr-TR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Use cached voice or try finding it again
    if (!turkishVoice) initVoices();
    if (turkishVoice) {
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
        showToast('Playing as Guest');
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
                showToast(`Welcome ${user.displayName}!`);
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
            showToast('Please login first');
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
                showConfirmModal('Card Selection', 'Use your custom lucky card for this game?', () => {
                    state.card = distributeNumbersProfessionally(profileState.customCard);
                    showScreen('waiting-screen');
                    listenToRoom(code);
                }, () => {
                    showScreen('waiting-screen');
                    listenToRoom(code);
                }, 'Use Custom', 'Random Card');
            } else {
                showScreen('waiting-screen');
                listenToRoom(code);
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
            showToast('Please login first');
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
                        showToast('Game already started');
                        return;
                    }

                    // RDB doesn't have native ArrayUnion, we handle it manually
                    let players = data.players || [];
                    if (players.length >= 6) {
                        showToast('Room is full');
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
                        showToast('Not enough coins!');
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
                        showConfirmModal('Card Selection', 'Use your custom lucky card for this game?', () => {
                            state.card = distributeNumbersProfessionally(profileState.customCard);
                            enterWaitingRoom(code);
                        }, () => {
                            enterWaitingRoom(code);
                        }, 'Use Custom', 'Random Card');
                    } else {
                        enterWaitingRoom(code);
                    }
                } else {
                    showToast('Room not found');
                }
            } catch (error) {
                console.error('Join Room Error:', error);
                showToast('Error: ' + error.message);
            }
        } else {
            showToast('Invalid Room Code');
        }
    });

    function enterWaitingRoom(code) {
        showScreen('waiting-screen');
        listenToRoom(code);
    }

    document.getElementById('back-to-lobby').addEventListener('click', () => {
        showConfirmModal('Leave Room', 'Do you want to leave this room?', () => {
            leaveRoom();
        });
    });

    document.getElementById('start-game-btn').addEventListener('click', async () => {
        if (state.isHost) {
            try {
                const roomRef = firebase.database().ref('rooms/' + state.roomCode);
                const snapshot = await roomRef.once('value');
                const data = snapshot.val();
                let players = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

                if (players.length === 1) {
                    showToast('Playing Solo? 3 AI Opponents joined!');
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

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            state.user = null;
            showScreen('login-screen');
            showToast('Logged out');
        });
    });

    // Copy Code
    document.getElementById('copy-code-btn').addEventListener('click', () => {
        const code = document.getElementById('display-room-code').innerText;
        navigator.clipboard.writeText(code).then(() => {
            showToast('Code copied to clipboard!');
        });
    });

    // Leave Game
    document.getElementById('leave-game-btn').addEventListener('click', () => {
        showConfirmModal('Quit Game', 'Are you sure you want to leave the current game?', () => {
            leaveRoom();
        });
    });



    // Game Over Buttons
    document.getElementById('play-again-btn').addEventListener('click', async () => {
        if (!state.isHost) {
            showToast('Only host can restart');
            return;
        }
        await firebase.database().ref('rooms/' + state.roomCode).update({
            status: 'waiting',
            drawnNumbers: [0],
            currentNumber: null,
            winner: null,
            playerData: null // Reset progress/cards
        });
        state.card = [];
        state.drawnNumbers = [];
        showScreen('waiting-screen');
    });

    document.getElementById('exit-to-lobby-btn').addEventListener('click', () => {
        showConfirmModal('Exit Game', 'Are you sure you want to exit to the lobby? Your game progress will be lost.', () => {
            leaveRoom();
        });
    });
});

// Listener for Room Updates
function listenToRoom(roomId) {
    firebase.database().ref('rooms/' + roomId)
        .on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Update Players List
            const list = document.getElementById('waiting-player-list');
            list.innerHTML = '';

            // RDB might return an "object" instead of array if indices are sparse, 
            // but usually it's an array if they are sequential.
            const players = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

            players.forEach(p => {
                const div = document.createElement('div');
                div.className = 'player-item';
                div.innerText = p.displayName + (p.uid === data.host ? ' (Host)' : '');
                list.appendChild(div);
            });

            document.getElementById('waiting-status').innerText = `${players.length}/6 Players`;

            // Host Start Button Visibility
            if (state.isHost && players.length >= 1) { // Allow 1 player for testing
                document.getElementById('start-game-btn').classList.remove('hidden');
            }

            // Game Start Logic
            if (data.status === 'playing' && state.currentScreen !== 'game-screen') {
                showScreen('game-screen');
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
                state.card = [];
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

            // Sync Opponent Cards
            const playerData = data.playerData || {};
            const opponentsContainer = document.getElementById('opponents-container');
            if (opponentsContainer) {
                opponentsContainer.innerHTML = '';
                Object.keys(playerData).forEach(uid => {
                    if (!state.user || uid === state.user.uid) return;

                    const p = playerData[uid];
                    if (!p) return;

                    const card = p.card || [];
                    const progress = p.progress || {};
                    const claimsCount = p.claimsCount || 0;
                    const themeClass = p.themeClass || '';

                    const div = document.createElement('div');
                    div.className = `opponent-card-mini ${themeClass}`;

                    let miniGridHtml = '<div class="mini-grid">';
                    card.forEach(row => {
                        if (Array.isArray(row)) {
                            row.forEach(num => {
                                const isMarked = progress && progress[num] === true;
                                miniGridHtml += `<div class="mini-cell ${num ? 'has-num' : ''} ${isMarked ? 'marked' : ''}"></div>`;
                            });
                        }
                    });
                    miniGridHtml += '</div>';

                    // Prepare stars for claims
                    let starsHtml = '<div class="opponent-stars">';
                    if (claimsCount >= 1) starsHtml += '<span class="star">⭐</span>';
                    if (claimsCount >= 2) starsHtml += '<span class="star">⭐</span>';
                    starsHtml += '</div>';

                    div.innerHTML = `
                        <div class="opponent-header">
                            <div class="opponent-name">${p.displayName || 'Guest'}</div>
                            ${starsHtml}
                        </div>
                        ${miniGridHtml}
                    `;
                    opponentsContainer.appendChild(div);
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

    const grid = Array(3).fill(0).map(() => Array(9).fill(null));
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
                grid[r][colIdx] = null;
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
            themeClass: themeClass
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
        if (!state.isHost || state.currentScreen !== 'game-screen') {
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
                    const markedInRow = row.filter(n => n === null || (p.progress && p.progress[n]) || n === num);
                    if (markedInRow.length === 9) rowsCompleted++;
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

    const display = document.getElementById('current-number');
    display.innerText = currentNum;

    // Pulse animation
    display.parentElement.style.animation = 'none';
    display.parentElement.offsetHeight; // trigger reflow
    display.parentElement.style.animation = 'drawNum 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Voice Announcement
    speakNumber(currentNum);

    // Update History
    const historyContainer = document.getElementById('last-numbers-container');
    if (historyContainer) {
        historyContainer.innerHTML = '';
        // Last 5 numbers (excluding the very current one if needed, or including it)
        // Usually history is what came BEFORE.
        const history = state.drawnNumbers.slice(-6, -1);
        history.reverse().forEach(num => {
            const span = document.createElement('div');
            span.className = 'history-num';
            span.innerText = num;
            historyContainer.appendChild(span);
        });
    }
}

// --- Game Logic ---

function generateTombalaCard() {
    // Tombala Card Rules:
    // 3 Rows, 9 Columns
    // 5 numbers per row (total 15 numbers)
    // Columns: 1-9, 10-19, 20-29, ... 80-90

    // Step 1: Initialize empty 3x9 grid
    let grid = Array(3).fill(null).map(() => Array(9).fill(null));

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

function renderCard(grid, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Apply theme
    const theme = MARKET_ITEMS.find(i => i.id === (profileState.equippedTheme || 'classic'));
    if (theme && theme.themeClass) {
        container.className = `tombala-card ${theme.themeClass}`;
    } else {
        container.className = 'tombala-card';
    }

    grid.forEach((row, rIdx) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'card-row';

        row.forEach((num, cIndex) => {
            const cell = document.createElement('div');
            cell.className = num === null ? 'card-cell empty' : 'card-cell';
            if (num !== null) {
                cell.innerText = num;
                cell.dataset.value = num;
                cell.addEventListener('click', onCellClick);
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
    // Check 1. Cinko, 2. Cinko, Tombala
    // Get all rows from DOM or State

    const cardDiv = document.getElementById('my-card');
    const rows = cardDiv.querySelectorAll('.card-row');
    let rowsCompleted = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('.card-cell:not(.empty)');
        const marked = row.querySelectorAll('.card-cell.marked');
        if (cells.length === marked.length && cells.length > 0) {
            rowsCompleted++;
        }
    });

    const btn1 = document.getElementById('claim-1cinko');
    const btn2 = document.getElementById('claim-2cinko');
    const btnT = document.getElementById('claim-tombala');

    if (rowsCompleted >= 1) {
        btn1.classList.add('active');
        btn1.disabled = false;
    }
    if (rowsCompleted >= 2) {
        btn2.classList.add('active');
        btn2.disabled = false;
    }

    // Sync claim count to Firebase
    if (state.roomCode && state.user) {
        firebase.database().ref(`rooms/${state.roomCode}/playerData/${state.user.uid}`).update({
            claimsCount: rowsCompleted
        });
    }

    if (rowsCompleted === 3) {
        btnT.classList.add('active');
        btnT.disabled = false;

        // AUTO WIN: if tombala is claimed, update Firebase winner
        if (state.roomCode) {
            firebase.database().ref('rooms/' + state.roomCode).update({
                winner: state.user
            });
        }
    }
}


