const GameStorage = {
    KEYS: {
        PLAYER_NAME: 'cutshape_player_name',
        DIFFICULTY: 'cutshape_difficulty',
        CURRENT_SCORE: 'cutshape_current_score',
        RATINGS: 'cutshape_ratings',
        GAME_STATE: 'cutshape_game_state'
    },

    savePlayerName(name) {
        localStorage.setItem(this.KEYS.PLAYER_NAME, name);
    },

    getPlayerName() {
        return localStorage.getItem(this.KEYS.PLAYER_NAME) || '';
    },

    saveDifficulty(difficulty) {
        localStorage.setItem(this.KEYS.DIFFICULTY, difficulty);
    },

    getDifficulty() {
        return localStorage.getItem(this.KEYS.DIFFICULTY) || 'easy';
    },

    clearGameState() {
        localStorage.removeItem(this.KEYS.GAME_STATE);
    },

    saveGameResult(playerName, score, level, difficulty) {
        const ratings = this.getRatings();
        const result = {
            id: Date.now(),
            playerName,
            score,
            level,
            difficulty,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        ratings.push(result);

        ratings.sort((a, b) => b.score - a.score);

        if (ratings.length > 100) {
            ratings.splice(100);
        }

        localStorage.setItem(this.KEYS.RATINGS, JSON.stringify(ratings));
        return result;
    },

    getRatings() {
        const ratings = localStorage.getItem(this.KEYS.RATINGS);
        return ratings ? JSON.parse(ratings) : [];
    },

    getRatingsByDifficulty(difficulty) {
        return this.getRatings().filter(r => r.difficulty === difficulty);
    },

    clearRatings() {
        localStorage.removeItem(this.KEYS.RATINGS);
    },

    getStats() {
        const ratings = this.getRatings();
        const uniquePlayers = new Set(ratings.map(r => r.playerName));

        return {
            totalGames: ratings.length,
            totalPlayers: uniquePlayers.size,
            bestScore: ratings.length > 0 ? ratings[0].score : 0,
            averageScore: ratings.length > 0
                ? Math.round(ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length)
                : 0
        };
    },

    exportData() {
        return {
            ratings: this.getRatings(),
            exportDate: new Date().toISOString()
        };
    },

};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStorage;
}

