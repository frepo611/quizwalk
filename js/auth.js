class AuthManager {
    constructor() {
        this.currentUser = null;
    }

    async init() {
        this.loadSession();
    }

    loadSession() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            return true;
        }
        return false;
    }

    login(username) {
        if (!username.trim()) {
            throw new Error('Username cannot be empty');
        }

        this.currentUser = username;
        localStorage.setItem('currentUser', username);

        // Initialize user data if it doesn't exist
        const users = this.getUsers();
        if (!users[username]) {
            users[username] = {
                highScores: [],
                totalGamesPlayed: 0,
                totalQuestionsAnswered: 0
            };
            this.saveUsers(users);
        }

        return true;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        return true;
    }

    getUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : {};
    }

    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }
}