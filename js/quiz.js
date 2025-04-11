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
    constructor() {
        this.activeQuizzes = {}; // { quizId: { answeredQuestions: [questionId, ...] } }
        this.completedQuizzes = []; // Array of completed quiz IDs
    }

    startQuiz(quizId) {
        if (!this.activeQuizzes[quizId]) {
            this.activeQuizzes[quizId] = { answeredQuestions: [] };
        }
    }

    answerQuestion(quizId, questionId) {
        if (this.activeQuizzes[quizId]) {
            this.activeQuizzes[quizId].answeredQuestions.push(questionId);
        }
    }

    completeQuiz(quizId) {
        if (this.activeQuizzes[quizId]) {
            this.completedQuizzes.push(quizId);
            delete this.activeQuizzes[quizId];
        }
    }
}

class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.apiUrl = 'https://opentdb.com/api.php';
    }

    async init() {
        // Initialize quiz state
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
}