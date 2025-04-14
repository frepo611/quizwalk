class Quiz {
    constructor(id, name, questions) {
        this.id = id; // Unique identifier for the quiz
        this.name = name; // Name of the quiz
        this.questions = questions; // Array of questions with positions
    }
}

class Question {
    constructor(id, text, position) {
        this.id = id; // Unique identifier for the question
        this.text = text; // The question text
        this.position = position; // { latitude: number, longitude: number }
    }
}

class UserProgress {
    constructor(storageManager) {
        this.storageManager = storageManager; // Add StorageManager instance
        this.activeQuizzes = this.storageManager.getUserStats('activeQuizzes') || {}; // Load active quizzes
        this.completedQuizzes = Array.isArray(this.storageManager.getUserStats('completedQuizzes'))
            ? this.storageManager.getUserStats('completedQuizzes')
            : []; // Ensure completedQuizzes is an array
    }

    startQuiz(quizId) {
        if (!this.activeQuizzes[quizId]) {
            this.activeQuizzes[quizId] = { answeredQuestions: [] };
            this.storageManager.updateUserStats('activeQuizzes', this.activeQuizzes); // Persist active quizzes
        }
    }

    answerQuestion(quizId, questionId) {
        if (this.activeQuizzes[quizId]) {
            this.activeQuizzes[quizId].answeredQuestions.push(questionId);
            this.storageManager.updateUserStats('activeQuizzes', this.activeQuizzes); // Persist active quizzes
        }
    }

    completeQuiz(quizId) {
        if (this.activeQuizzes[quizId]) {
            this.completedQuizzes.push(quizId);
            delete this.activeQuizzes[quizId];
            this.storageManager.updateUserStats('activeQuizzes', this.activeQuizzes); // Persist active quizzes
            this.storageManager.updateUserStats('completedQuizzes', this.completedQuizzes); // Persist completed quizzes
        }
    }
}

class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.apiUrl = 'https://opentdb.com/api.php';
        this.storageManager = new StorageManager(); // Add StorageManager instance
    }

    async init() {
        await this.storageManager.init(); // Initialize StorageManager
        const savedQuiz = this.storageManager.loadGameState();
        if (savedQuiz) {
            this.currentQuiz = savedQuiz; // Restore saved quiz state
        }
    }

    async fetchQuestions(amount = 5) {
        try {
            const response = await fetch(`${this.apiUrl}?amount=${amount}`);
            const data = await response.json();
            
            if (data.response_code === 0) {
                return this.processQuestions(data.results);
            } else {
                throw new Error('Failed to fetch questions');
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            throw error;
        }
    }

    processQuestions(questions) {
        return questions.map(q => ({
            question: q.question,
            correct_answer: q.correct_answer,
            incorrect_answers: q.incorrect_answers,
            category: q.category,
            difficulty: q.difficulty,
            // Add random coordinates within game area
            location: this.generateQuestionLocation()
        }));
    }

    generateQuestionLocation() {
        // TODO: Implement logic to generate coordinates within game bounds
        return {
            lat: 0,
            lng: 0
        };
    }

    checkAnswer(questionId, answer) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (!question) return false;
        return question.correct_answer === answer;
    }

    calculateScore(timeSpent, distance) {
        // Base score for correct answer
        let score = 100;
        
        // Deduct points based on time (if took more than 1 minute)
        const timeDeduction = Math.max(0, timeSpent - 60) * 0.5;
        score -= timeDeduction;

        // Bonus points for proximity (closer = more points)
        const proximityBonus = Math.max(0, 20 - distance) * 2;
        score += proximityBonus;

        return Math.max(0, Math.round(score));
    }

    saveCurrentQuiz() {
        if (this.currentQuiz) {
            this.storageManager.saveGameState(this.currentQuiz); // Save current quiz state
        }
    }

    clearCurrentQuiz() {
        this.currentQuiz = null;
        this.storageManager.clearGameState(); // Clear saved quiz state
    }
}