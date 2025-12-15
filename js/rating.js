document.addEventListener('DOMContentLoaded', () => {
    const ratingTableBody = document.getElementById('ratingTableBody');
    const noResults = document.getElementById('noResults');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const clearRatingBtn = document.getElementById('clearRating');
    const backToMenuBtn = document.getElementById('backToMenu');
    
    const totalGamesEl = document.getElementById('totalGames');
    const bestScoreEl = document.getElementById('bestScore');
    const totalPlayersEl = document.getElementById('totalPlayers');

    let currentFilter = 'all';

    function loadRatings(filter = 'all') {
        const ratings = filter === 'all'
            ? GameStorage.getRatings()
            : GameStorage.getRatingsByDifficulty(filter);

        ratingTableBody.innerHTML = '';

        if (ratings.length === 0) {
            noResults.style.display = 'block';
            document.querySelector('.rating-table').style.display = 'none';
            return;
        }

        noResults.style.display = 'none';
        document.querySelector('.rating-table').style.display = 'table';

        const currentPlayer = GameStorage.getPlayerName();

        ratings.forEach((rating, index) => {
            const row = document.createElement('tr');
            if (rating.playerName === currentPlayer) {
                row.classList.add('highlight');
            }

            const rankMedal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

            const difficultyNames = {
                easy: 'Легкий',
                medium: 'Средний',
                hard: 'Сложный'
            };

            const date = new Date(rating.date);
            const dateStr = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});

            row.innerHTML = `
                <td><span class="rank-medal">${rankMedal}</span> ${index + 1}</td>
                <td>${rating.playerName}</td>
                <td><strong>${rating.score}</strong></td>
                <td>${rating.level}</td>
                <td>${difficultyNames[rating.difficulty]}</td>
                <td>${dateStr}</td>
            `;

            ratingTableBody.appendChild(row);

            row.style.animation = `slideIn 0.3s ease-out ${index * 0.05}s both`;
        });
    }

    function loadStats() {
        const stats = GameStorage.getStats();

        totalGamesEl.textContent = stats.totalGames;
        bestScoreEl.textContent = stats.bestScore;
        totalPlayersEl.textContent = stats.totalPlayers;

        animateNumber(totalGamesEl, 0, stats.totalGames, 1000);
        animateNumber(bestScoreEl, 0, stats.bestScore, 1000);
        animateNumber(totalPlayersEl, 0, stats.totalPlayers, 1000);
    }

    function animateNumber(element, start, end, duration) {
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.dataset.filter;
            loadRatings(currentFilter);
        });
    });

    clearRatingBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить весь рейтинг? Это действие нельзя отменить!')) {
            GameStorage.clearRatings();
            loadRatings(currentFilter);
            loadStats();

            // Показать уведомление
            showNotification('Рейтинг очищен!', 'success');
        }
    });

    backToMenuBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#28a745' : '#667eea'};
            color: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            window.location.href = 'index.html';
        }

        if (e.key === '1') filterButtons[0].click();
        if (e.key === '2') filterButtons[1].click();
        if (e.key === '3') filterButtons[2].click();
        if (e.key === '4') filterButtons[3].click();
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            const data = GameStorage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cutshape_ratings_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('Рейтинг экспортирован!', 'success');
        }
    });

    loadRatings(currentFilter);
    loadStats();
});
document.addEventListener('DOMContentLoaded', () => {
    const playerNameInput = document.getElementById('playerName');
    const nameError = document.getElementById('nameError');
    const startGameBtn = document.getElementById('startGame');
    const viewRatingBtn = document.getElementById('viewRating');
    const levelButtons = document.querySelectorAll('.level-btn');
    
    let selectedDifficulty = null;

    const savedName = GameStorage.getPlayerName();
    if (savedName) {
        playerNameInput.value = savedName;
        validateName();
    }

    const savedDifficulty = GameStorage.getDifficulty();
    if (savedDifficulty) {
        selectDifficulty(savedDifficulty);
    }

    // Валидация имени
    function validateName() {
        const name = playerNameInput.value.trim();
        
        if (name.length === 0) {
            nameError.textContent = '';
            startGameBtn.disabled = true;
            return false;
        }
        
        if (name.length < 2) {
            nameError.textContent = 'Имя должно содержать минимум 2 символа';
            startGameBtn.disabled = true;
            return false;
        }
        
        if (name.length > 20) {
            nameError.textContent = 'Имя не должно превышать 20 символов';
            startGameBtn.disabled = true;
            return false;
        }
        
        nameError.textContent = '';
        startGameBtn.disabled = !selectedDifficulty;
        return true;
    }

    function selectDifficulty(difficulty) {
        selectedDifficulty = difficulty;
        
        levelButtons.forEach(btn => {
            if (btn.dataset.level === difficulty) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
        
        startGameBtn.disabled = !validateName();
    }

    playerNameInput.addEventListener('input', validateName);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !startGameBtn.disabled) {
            startGame();
        }
    });

    levelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectDifficulty(btn.dataset.level);
        });
        
        btn.addEventListener('dblclick', () => {
            selectDifficulty(btn.dataset.level);
            if (!startGameBtn.disabled) {
                setTimeout(() => startGame(), 100);
            }
        });
    });

    startGameBtn.addEventListener('click', startGame);
    viewRatingBtn.addEventListener('click', () => {
        window.location.href = 'rating.html';
    });

    function startGame() {
        const name = playerNameInput.value.trim();
        
        if (validateName() && selectedDifficulty) {
            GameStorage.savePlayerName(name);
            GameStorage.saveDifficulty(selectedDifficulty);
            GameStorage.clearGameState();
            
            document.querySelector('.intro-content').style.animation = 'fadeIn 0.3s reverse';
            setTimeout(() => {
                window.location.href = 'game.html';
            }, 300);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === '1') selectDifficulty('easy');
        if (e.key === '2') selectDifficulty('medium');
        if (e.key === '3') selectDifficulty('hard');
        if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
            window.location.href = 'rating.html';
        }
    });

    levelButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-5px) rotate(2deg)';
        });
        
        btn.addEventListener('mouseleave', () => {
            if (!btn.classList.contains('selected')) {
                btn.style.transform = '';
            }
        });
    });
});

