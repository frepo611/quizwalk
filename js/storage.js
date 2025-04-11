class StorageManager {
    constructor() {
        this.storagePrefix = 'quizwalk_';
    }

    async init() {
        // Verify localStorage is available
        if (!this.isStorageAvailable()) {
            throw new Error('Local storage is not available');
        }
    }

    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }

    saveGameState(state) {
        localStorage.setItem(this.storagePrefix + 'gameState', JSON.stringify(state));
    }

    loadGameState() {
        const state = localStorage.getItem(this.storagePrefix + 'gameState');
        return state ? JSON.parse(state) : null;
    }

    clearGameState() {
        localStorage.removeItem(this.storagePrefix + 'gameState');
    }

    saveUserScore(username, score) {
        const scores = this.getUserScores(username);
        scores.push({
            score: score,
            date: new Date().toISOString(),
            timestamp: Date.now()
        });
        
        // Keep only top 10 scores
        scores.sort((a, b) => b.score - a.score);
        const topScores = scores.slice(0, 10);
        
        localStorage.setItem(
            this.storagePrefix + `scores_${username}`, 
            JSON.stringify(topScores)
        );
    }

    getUserScores(username) {
        const scores = localStorage.getItem(this.storagePrefix + `scores_${username}`);
        return scores ? JSON.parse(scores) : [];
    }

    updateUserStats(username, stats) {
        const key = this.storagePrefix + `stats_${username}`;
        const currentStats = this.getUserStats(username);
        const updatedStats = { ...currentStats, ...stats };
        localStorage.setItem(key, JSON.stringify(updatedStats));
    }

    getUserStats(username) {
        const key = this.storagePrefix + `stats_${username}`;
        const stats = localStorage.getItem(key);
        return stats ? JSON.parse(stats) : {
            totalGamesPlayed: 0,
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            totalDistance: 0,
            averageScore: 0
        };
    }

    clearUserData(username) {
        localStorage.removeItem(this.storagePrefix + `scores_${username}`);
        localStorage.removeItem(this.storagePrefix + `stats_${username}`);
    }
}