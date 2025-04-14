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
    const storageManager = new StorageManager();
    const quizManager = new QuizManager();
    let userProgress;

    const authSection = document.getElementById('authSection');
    const gameSection = document.getElementById('gameSection');
    const authForm = document.getElementById('authForm');
    const usernameInput = document.getElementById('username');
    const userDisplay = document.getElementById('userDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    const questionSection = document.getElementById('questionSection');
    const questionText = document.getElementById('questionText');
    const answerOptions = document.getElementById('answerOptions');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const currentScore = document.getElementById('currentScore');

    let currentUser = null;

    // Initialize StorageManager and QuizManager
    storageManager.init().then(() => {
        quizManager.init();
    });

    // Handle user login
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (username) {
            currentUser = storageManager.getUser(username) || { username, preferences: {} };
            storageManager.saveUser(currentUser);
            userProgress = new UserProgress(storageManager);
            userDisplay.textContent = `Logged in as: ${currentUser.username}`;
            authSection.classList.add('hidden');
            gameSection.classList.remove('hidden');
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        authSection.classList.remove('hidden');
        gameSection.classList.add('hidden');
    });

    // Start a new game
    startGameBtn.addEventListener('click', async () => {
        const questions = await quizManager.fetchQuestions(5);
        quizManager.currentQuiz = new Quiz(Date.now(), 'New Quiz', questions);
        quizManager.saveCurrentQuiz();
        userProgress.startQuiz(quizManager.currentQuiz.id);
        displayQuestion(0);
    });

    // Display a question
    function displayQuestion(index) {
        const question = quizManager.currentQuiz.questions[index];
        if (!question) return;

        questionSection.classList.remove('hidden');
        questionText.textContent = question.question;
        answerOptions.innerHTML = '';

        const allAnswers = [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5);
        allAnswers.forEach((answer) => {
            const button = document.createElement('button');
            button.textContent = answer;
            button.classList.add('btn');
            button.addEventListener('click', () => handleAnswer(index, answer));
            answerOptions.appendChild(button);
        });
    }

    // Handle answer submission
    function handleAnswer(index, answer) {
        const question = quizManager.currentQuiz.questions[index];
        const isCorrect = quizManager.checkAnswer(question.id, answer);
        const score = quizManager.calculateScore(30, 10); // Example time and distance
        currentScore.textContent = parseInt(currentScore.textContent) + (isCorrect ? score : 0);
        scoreDisplay.classList.remove('hidden');
        userProgress.answerQuestion(quizManager.currentQuiz.id, question.id);

        if (index + 1 < quizManager.currentQuiz.questions.length) {
            displayQuestion(index + 1);
        } else {
            quizManager.clearCurrentQuiz();
            userProgress.completeQuiz(quizManager.currentQuiz.id);
            alert('Quiz completed!');
        }
    }
});