// Profile & Card Editor Logic

const profileState = {
    coins: 1000,
    luckyNumber: '--',
    stats: {},
    customCard: null,
    selectedNumbers: [],
    inventory: ['classic'],
    equippedTheme: 'classic'
};

const MARKET_ITEMS = [
    { id: 'classic', name: 'Classic Blue', price: 0, themeClass: '', description: 'Default cam look' },
    { id: 'purple', name: 'Midnight Purple', price: 500, themeClass: 'theme-purple', description: 'Deep space' },
    { id: 'neon', name: 'Neon Nights', price: 3000, themeClass: 'theme-neon', description: 'Electric vibe' },
    { id: 'gold', name: 'Royal Gold', price: 7500, themeClass: 'theme-gold', description: 'Premium luxury' }
]; // For editor

// Initialized on Login
async function initProfile(user) {
    if (!user) return;

    const userRef = firebase.database().ref(`users/${user.uid}`);

    // Listen for balance and customizations
    userRef.child('profile').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        profileState.coins = data.coins !== undefined ? data.coins : 1000;
        profileState.customCard = data.customCard || null;
        profileState.inventory = data.inventory || ['classic'];
        profileState.equippedTheme = data.equippedTheme || 'classic';

        updateProfileUI();
        updateLobbyBalance();
        renderShop();
        renderInventory();
    });

    // Listen for stats
    userRef.child('stats').on('value', (snapshot) => {
        const stats = snapshot.val() || {};
        profileState.stats = stats;
        calculateLuckyNumber();
        updateProfileUI();
    });
}

function updateLobbyBalance() {
    const balEl = document.getElementById('user-balance');
    if (balEl) balEl.innerText = profileState.coins;
}

function updateProfileUI() {
    const avatar = document.getElementById('profile-avatar');
    const name = document.getElementById('profile-name');
    const coins = document.getElementById('profile-coins-val');
    const lucky = document.getElementById('lucky-number-val');

    if (state.user && avatar && name) {
        avatar.src = state.user.photoURL || 'https://via.placeholder.com/100';
        name.innerText = state.user.displayName || 'Guest';
    }

    if (coins) coins.innerText = profileState.coins;
    if (lucky) lucky.innerText = profileState.luckyNumber;
}

function calculateLuckyNumber() {
    let maxCount = 0;
    let lucky = '--';

    for (const [num, count] of Object.entries(profileState.stats)) {
        if (count > maxCount) {
            maxCount = count;
            lucky = num;
        }
    }

    profileState.luckyNumber = lucky;
}

// Stats tracking hook
async function trackMarkedNumber(num) {
    if (!state.user || state.user.isGuest) return;

    const statsRef = firebase.database().ref(`users/${state.user.uid}/stats/${num}`);
    await statsRef.transaction((currentCount) => (currentCount || 0) + 1);
}

// --- Card Editor Logic ---

function initEditor() {
    const grid = document.getElementById('editor-grid');
    const picker = document.getElementById('num-picker-panel');

    grid.innerHTML = '';
    picker.innerHTML = '';
    profileState.selectedNumbers = profileState.customCard ? [...profileState.customCard] : [];

    // Generate 3x9 Grid
    for (let i = 0; i < 27; i++) {
        const cell = document.createElement('div');
        cell.className = 'editor-cell empty';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }

    // Generate 1-90 Picker
    for (let i = 1; i <= 90; i++) {
        const btn = document.createElement('div');
        btn.className = 'num-pick';
        btn.innerText = i;
        if (profileState.selectedNumbers.includes(i)) btn.classList.add('used');

        btn.onclick = () => selectNumberForEditor(i, btn);
        picker.appendChild(btn);
    }

    renderEditorCard();
}

function selectNumberForEditor(num, btn) {
    if (profileState.selectedNumbers.includes(num)) return;

    if (profileState.selectedNumbers.length >= 15) {
        showToast('Maximum 15 numbers allowed!');
        return;
    }

    // Rule: Max 3 per column
    const colIdx = Math.floor((num === 90 ? 89 : num) / 10);
    const colCount = profileState.selectedNumbers.filter(n => {
        const c = Math.floor((n === 90 ? 89 : n) / 10);
        return c === colIdx;
    }).length;

    if (colCount >= 3) {
        showToast(`Column ${colIdx + 1} is full (max 3 numbers)!`);
        return;
    }

    profileState.selectedNumbers.push(num);
    btn.classList.add('used');
    renderEditorCard();
}

function renderEditorCard() {
    const cells = document.querySelectorAll('.editor-cell');
    cells.forEach(c => {
        c.innerText = '';
        c.classList.add('empty');
        c.classList.remove('selected');
        c.onclick = null;
    });

    if (profileState.selectedNumbers.length === 0) return;

    const grid = distributeNumbersProfessionally(profileState.selectedNumbers);
    if (!grid) {
        // Fallback for partial/invalid states during selection
        const sorted = [...profileState.selectedNumbers].sort((a, b) => a - b);
        sorted.forEach((num) => {
            const colIdx = Math.floor((num === 90 ? 89 : num) / 10);
            for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
                const cellIdx = rowIdx * 9 + colIdx;
                const targetCell = cells[cellIdx];
                if (targetCell.innerText === '') {
                    targetCell.innerText = num;
                    targetCell.classList.remove('empty');
                    targetCell.classList.add('selected');
                    targetCell.onclick = () => removeNumberFromEditor(num);
                    break;
                }
            }
        });
        return;
    }

    // Render the professional grid
    grid.forEach((row, rIdx) => {
        row.forEach((num, cIdx) => {
            if (num) {
                const cellIdx = rIdx * 9 + cIdx;
                const targetCell = cells[cellIdx];
                targetCell.innerText = num;
                targetCell.classList.remove('empty');
                targetCell.classList.add('selected');
                targetCell.onclick = () => removeNumberFromEditor(num);
            }
        });
    });
}

function removeNumberFromEditor(num) {
    profileState.selectedNumbers = profileState.selectedNumbers.filter(n => n !== num);
    document.querySelectorAll('.num-pick').forEach(p => {
        if (parseInt(p.innerText) === num) p.classList.remove('used');
    });
    renderEditorCard();
}

/**
 * Distributes 15 numbers into a 3x9 grid where each row has exactly 5 numbers.
 * Uses a backtracking approach to find a valid professional layout.
 */
function distributeNumbersProfessionally(numbers) {
    if (numbers.length < 1) return null;

    const colGroups = Array(9).fill(0).map(() => []);
    numbers.forEach(n => {
        const c = Math.floor((n === 90 ? 89 : n) / 10);
        colGroups[c].push(n);
    });
    colGroups.forEach(g => g.sort((a, b) => a - b));

    const grid = Array(3).fill(0).map(() => Array(9).fill(null));
    const rowCounts = [0, 0, 0];

    function solve(colIdx, numInColIdx) {
        if (colIdx === 9) {
            return rowCounts.every(count => count === (numbers.length / 3));
            // This assumes 15 numbers (5 per row). If fewer, it just returns true.
        }

        const group = colGroups[colIdx];
        if (numInColIdx === group.length) {
            return solve(colIdx + 1, 0);
        }

        const num = group[numInColIdx];

        // Try placing in each row, but must maintain vertical order
        let startRow = 0;
        if (numInColIdx > 0) {
            // Must be in a row > previous number's row in this column
            const prevNum = group[numInColIdx - 1];
            for (let r = 0; r < 3; r++) {
                if (grid[r][colIdx] === prevNum) {
                    startRow = r + 1;
                    break;
                }
            }
        }

        for (let r = startRow; r < 3; r++) {
            // Professional Tombala Rule: Exactly 5 per row (if we have 15)
            // If we have < 15, we just don't want to exceed 5.
            const limit = numbers.length === 15 ? 5 : 6; // Relax during building

            if (rowCounts[r] < limit) {
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
    return null;
}

async function saveCustomCard() {
    if (profileState.selectedNumbers.length !== 15) {
        showToast('You must select exactly 15 numbers!');
        return;
    }

    if (!state.user) return;

    try {
        await firebase.database().ref(`users/${state.user.uid}/profile/customCard`).set(profileState.selectedNumbers);
        showToast('Card saved successfully!');
        showScreen('profile-screen');
    } catch (e) {
        showToast('Error saving card: ' + e.message);
    }
}

// Navigation Listeners
document.getElementById('open-profile-btn').addEventListener('click', () => {
    if (state.user && !state.user.isGuest) {
        showScreen('profile-screen');
        updateProfileUI();
    } else {
        showToast('Please sign in with Google to access profile features.');
    }
});

document.getElementById('profile-to-lobby').addEventListener('click', () => showScreen('lobby-screen'));

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

function renderShop() {
    const marketGrid = document.getElementById('market-items');
    if (!marketGrid) return;
    marketGrid.innerHTML = '';

    MARKET_ITEMS.forEach(item => {
        if (profileState.inventory.includes(item.id)) return; // Don't show owned in shop? 
        // Or show them as "Bought". Let's hide them from "Shop" to keep it clean.

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-preview ${item.themeClass}" style="background: rgba(255,255,255,0.1)">${item.name}</div>
            <span class="item-name">${item.name}</span>
            <span class="item-price"><i class="fas fa-coins"></i> ${item.price}</span>
            <button class="btn-mini buy-btn" data-id="${item.id}">Buy</button>
        `;

        card.querySelector('.buy-btn').onclick = () => buyItem(item);
        marketGrid.appendChild(card);
    });
}

function renderInventory() {
    const invGrid = document.getElementById('inventory-items');
    if (!invGrid) return;
    invGrid.innerHTML = '';

    MARKET_ITEMS.forEach(item => {
        if (!profileState.inventory.includes(item.id)) return;

        const isEquipped = profileState.equippedTheme === item.id;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-preview ${item.themeClass}" style="background: rgba(255,255,255,0.1)">${item.name}</div>
            <span class="item-name">${item.name}</span>
            ${isEquipped ? '<span class="status-badge equipped">Equipped</span>' : '<button class="btn-mini equip-btn">Equip</button>'}
        `;

        const equipBtn = card.querySelector('.equip-btn');
        if (equipBtn) equipBtn.onclick = () => equipTheme(item.id);

        invGrid.appendChild(card);
    });
}

async function buyItem(item) {
    if (profileState.coins < item.price) {
        showToast('Not enough coins!');
        return;
    }

    showConfirmModal('Buy Theme', `Buy ${item.name} for ${item.price} coins?`, async () => {
        try {
            const userRef = firebase.database().ref(`users/${state.user.uid}/profile`);
            const newInventory = [...profileState.inventory, item.id];
            const newCoins = profileState.coins - item.price;

            await userRef.update({
                inventory: newInventory,
                coins: newCoins
            });
            showToast('Purchased successfully!');
        } catch (e) {
            showToast('Error: ' + e.message);
        }
    });
}

async function equipTheme(themeId) {
    if (!state.user) return;
    try {
        await firebase.database().ref(`users/${state.user.uid}/profile/equippedTheme`).set(themeId);
        showToast('Theme equipped!');
    } catch (e) {
        showToast('Error equipping!');
    }
}

document.getElementById('editor-to-profile').addEventListener('click', () => showScreen('profile-screen'));
document.getElementById('save-custom-card-btn').addEventListener('click', saveCustomCard);
document.getElementById('edit-custom-card-btn').addEventListener('click', () => {
    showScreen('editor-screen');
    initEditor();
});
document.getElementById('clear-editor-btn').addEventListener('click', () => {
    profileState.selectedNumbers = [];
    document.querySelectorAll('.num-pick').forEach(p => p.classList.remove('used'));
    renderEditorCard();
    showToast('Selection cleared.');
});

document.getElementById('reset-stats-btn').addEventListener('click', () => {
    showConfirmModal('Reset Stats', 'This will delete all your marking history. Continue?', async () => {
        if (state.user) {
            await firebase.database().ref(`users/${state.user.uid}/stats`).remove();
            showToast('Stats reset.');
        }
    });
});
