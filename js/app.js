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
    const finalScoreDisplay = document.getElementById('finalScoreDisplay'); // New element
    const finalScoreEl = document.getElementById('finalScore'); // New element
    const totalQuestionsEl = document.getElementById('totalQuestions'); // New element

    let currentUser = null;
    let quizCompleted = false; // Add a flag to track quiz completion

    // Helper to decode HTML entities
    function decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    // Initialize StorageManager and QuizManager
    storageManager.init().then(() => {
        quizManager.init(); // This loads the global quiz state if it exists
    });

    // Handle user login
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (username) {
            currentUser = storageManager.getUser(username) || { username, preferences: {} };
            storageManager.saveUser(currentUser);
            // Pass username to UserProgress constructor
            userProgress = new UserProgress(storageManager, currentUser.username);
            userDisplay.textContent = `Logged in as: ${currentUser.username}`;
            authSection.classList.add('hidden');
            gameSection.classList.remove('hidden');

            // Check if there's a globally saved quiz and if user has progress for it
            const savedQuiz = quizManager.currentQuiz; // Get quiz loaded by quizManager.init()
            if (savedQuiz && userProgress.activeQuizzes[savedQuiz.id]) {
                // Resume only if the saved quiz ID matches an active quiz in user progress
                quizCompleted = false;
                const progress = userProgress.activeQuizzes[savedQuiz.id];
                const nextQuestionIndex = progress.answers.length;
                alert(`Resuming your saved quiz! You are on question ${nextQuestionIndex + 1}.`);
                displayQuestion(nextQuestionIndex);
            } else {
                // No valid saved state to resume, ensure UI is ready for new game
                questionSection.classList.add('hidden');
                finalScoreDisplay.classList.add('hidden');
                scoreDisplay.classList.add('hidden'); // Hide current score until game starts
            }
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
        quizCompleted = false;
        currentScore.textContent = "0";
        scoreDisplay.classList.remove('hidden');
        finalScoreDisplay.classList.add('hidden');

        // Get selected amount from input
        const amountInput = document.getElementById('amount');
        let amount = parseInt(amountInput.value, 10);
        if (isNaN(amount) || amount < 1) amount = 10;
        if (amount > 49) amount = 49;

        // Get selected categories from checkboxes
        const selectedCategories = Array.from(document.querySelectorAll('#categories input:checked'))
            .map(checkbox => parseInt(checkbox.value, 10));

        // Fetch questions with selected amount and categories
        const questions = await quizManager.fetchQuestions(amount, selectedCategories);

        // Create new quiz instance
        const newQuizId = Date.now();
        quizManager.currentQuiz = new Quiz(newQuizId, questions);
        quizManager.saveCurrentQuiz();

        userProgress.startQuiz(newQuizId);
        displayQuestion(0);
    });

    // Display a question
    function displayQuestion(index) {
        if (quizCompleted) {
            console.error('Quiz is already completed.');
            alert('Error: Quiz is already completed.');
            return;
        }

        if (!quizManager.currentQuiz) {
            console.error('No active quiz found.');
            alert('Error: No active quiz found.');
            return;
        }

        const question = quizManager.currentQuiz.questions[index];
        if (!question) {
            console.error('Invalid question index.');
            alert('Error: Invalid question index.');
            return;
        }

        questionSection.classList.remove('hidden');
        questionText.textContent = decodeHtml(question.question);
        answerOptions.innerHTML = '';

        // Use question.answers (with id, text, correct)
        question.answers.forEach((answer) => {
            const button = document.createElement('button');
            button.textContent = decodeHtml(answer.text);
            button.classList.add('btn');
            button.dataset.answerId = answer.id;
            button.addEventListener('click', () => handleAnswer(index, answer.id));
            answerOptions.appendChild(button);
        });
    }

    // Handle answer submission
    function handleAnswer(index, answerId) {
        // 1. Check if quiz is completed or active
        if (quizCompleted) {
            console.error('Quiz is already completed.');
            alert('Error: Quiz is already completed.');
            return;
        }

        if (!quizManager.currentQuiz) {
            console.error('No active quiz found.');
            alert('Error: No active quiz found.');
            return;
        }

        // 2. Get the current question
        const question = quizManager.currentQuiz.questions[index];
        if (!question) {
            console.error('Invalid question index.');
            alert('Error: Invalid question index.');
            return;
        }

        // 3. Use answerId for correctness check
        const isCorrect = quizManager.checkAnswer(question.id, answerId);

        // 4. Update the score display
        currentScore.textContent = parseInt(currentScore.textContent) + (isCorrect ? 1 : 0);
        scoreDisplay.classList.remove('hidden');

        // 5. Update user progress (mark question as answered)
        const answerObj = question.answers.find(a => a.id === answerId);
        // Pass the actual quiz ID
        userProgress.answerQuestion(
            quizManager.currentQuiz.id, // Use the actual quiz ID
            question.id,
            answerObj ? answerObj.text : "",
            isCorrect
        );

        // 6. UserProgress methods now handle saving, so remove saveUserProgress() call

        // 7. Move to next question or finish quiz
        if (index + 1 < quizManager.currentQuiz.questions.length) {
            displayQuestion(index + 1);
        } else {
            quizCompleted = true;
            const completedQuiz = quizManager.currentQuiz; // Get the whole quiz object before clearing
            const completedQuizId = completedQuiz.id;
            const totalQuestions = completedQuiz.questions.length;

            quizManager.clearCurrentQuiz(); // Clears global quiz state
            // Pass the quiz object to completeQuiz
            userProgress.completeQuiz(completedQuizId, completedQuiz);

            // Show final results
            const finalScore = parseInt(currentScore.textContent);
            finalScoreEl.textContent = finalScore;
            totalQuestionsEl.textContent = totalQuestions;
            finalScoreDisplay.classList.remove('hidden');
            questionSection.classList.add('hidden');
            scoreDisplay.classList.add('hidden');
        }
    }
});