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

    function validateName() {
        const name = playerNameInput.value.trim();

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
                startGame()
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
});

