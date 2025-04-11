// Main application orchestrator
class App {
    constructor() {
        this.location = new LocationManager();
        this.quiz = new QuizManager();
        this.auth = new AuthManager();
        this.storage = new StorageManager();
    }

    async init() {
        // Initialize all modules
        await this.auth.init();
        await this.location.init();
        await this.quiz.init();
        await this.storage.init();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});