class Quiz {
    constructor(id, questions) { // Remove name parameter
        this.id = id; // Unique identifier for the quiz
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
    constructor(storageManager, username) { // Add username to constructor
        this.storageManager = storageManager;
        this.username = username; // Store username
        this.loadProgress(); // Load progress on initialization
    }

    loadProgress() {
        const progressKey = `quizwalk_progress_${this.username}`;
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
            const parsed = JSON.parse(savedProgress);
            this.activeQuizzes = parsed.activeQuizzes || {};
            // Ensure completedQuizzes is an array of objects
            this.completedQuizzes = Array.isArray(parsed.completedQuizzes) ? parsed.completedQuizzes : [];
        } else {
            this.activeQuizzes = {};
            this.completedQuizzes = []; // Initialize as an empty array
        }
    }

    saveProgress() { // Add a method to save progress
        const progressKey = `quizwalk_progress_${this.username}`;
        localStorage.setItem(progressKey, JSON.stringify({
            activeQuizzes: this.activeQuizzes,
            completedQuizzes: this.completedQuizzes
        }));
    }

    startQuiz(quizId) {
        if (!this.activeQuizzes[quizId]) {
            this.activeQuizzes[quizId] = { answers: [] };
            this.saveProgress(); // Use the new save method
        }
    }

    answerQuestion(quizId, questionId, answer, correct) {
        if (this.activeQuizzes[quizId]) {
            // Avoid adding duplicate answers if user reloads and answers again
            const existingAnswer = this.activeQuizzes[quizId].answers.find(a => a.questionId === questionId);
            if (!existingAnswer) {
                this.activeQuizzes[quizId].answers.push({
                    questionId,
                    answer,
                    correct
                });
                this.saveProgress(); // Use the new save method
            }
        }
    }

    completeQuiz(quizId, quizObject) { // Accept the quiz object
        if (this.activeQuizzes[quizId]) {
            // Store an object with id and the quiz data
            this.completedQuizzes.push({
                id: quizId,
                quiz: quizObject, // Store the actual quiz object
                completionDate: new Date().toISOString(),
                answers: this.activeQuizzes[quizId].answers // Store the answers given for this quiz
            });
            delete this.activeQuizzes[quizId];
            this.saveProgress(); // Use the new save method
        }
    }
}

class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.apiUrl = 'https://opentdb.com/api.php';
        this.tokenUrl = 'https://opentdb.com/api_token.php?command=request';
        this.sessionToken = null;
        this.storageManager = new StorageManager(); // Add StorageManager instance
    }

    async init() {
        await this.storageManager.init(); // Initialize StorageManager
        const savedQuiz = this.storageManager.loadGameState();
        if (savedQuiz) {
            this.currentQuiz = savedQuiz; // Restore saved quiz state
        }
        
        // Try to load or request a session token
        this.sessionToken = localStorage.getItem('trivia_token');
    }

    async getSessionToken() {
        try {
            if (!this.sessionToken) {
                const response = await fetch(this.tokenUrl);
                const data = await response.json();
                if (data.response_code === 0) {
                    this.sessionToken = data.token;
                    localStorage.setItem('trivia_token', this.sessionToken);
                }
            }
            return this.sessionToken;
        } catch (error) {
            console.error('Error getting session token:', error);
            return null;
        }
    }

    async fetchQuestions(amount = 5, categories = []) {
        // Always use General Knowledge category (9)
        const generalKnowledgeCategoryId = 9;
        
        // Get or create session token
        const token = await this.getSessionToken();
        
        // Build URL with amount, token, and fixed category
        let url = `${this.apiUrl}?amount=${amount}&category=${generalKnowledgeCategoryId}`;
        if (token) {
            url += `&token=${token}`;
        }
        
        try {
            // Make a single API request
            console.log(`Making API request to: ${url}`);
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.response_code === 0) {
                return this.processQuestions(data.results);
            } else if (data.response_code === 4) {
                // Token empty, reset token
                console.log("Token empty, resetting token");
                this.sessionToken = null;
                localStorage.removeItem('trivia_token');
                
                // Try one more time without token
                console.log("Retrying without token");
                const newUrl = url.replace(/&token=[^&]+/, '');
                const newResponse = await fetch(newUrl);
                const newData = await newResponse.json();
                
                if (newData.response_code === 0) {
                    return this.processQuestions(newData.results);
                }
            } else {
                console.error(`API Error (code ${data.response_code}): `, data);
            }
            
            // If we get here, we couldn't get questions, return empty array
            return [];
            
        } catch (error) {
            console.error('Error fetching questions:', error);
            return [];
        }
    }
    
    // Helper to get numeric category ID from category string
    getCategoryId(categoryStr) {
        // Map of category strings to IDs based on Open Trivia DB
        const categoryMap = {
            'General Knowledge': 9,
            'Science & Nature': 17, 
            'Mythology': 20,
            'Sports': 21,
            'Geography': 22,
            'History': 23,
            'Politics': 24,
            'Art': 25,
            'Animals': 27,
            'Vehicles': 28
        };
        
        return categoryMap[categoryStr] || 9; // Default to General Knowledge
    }

    processQuestions(questions) {
        return questions.map((q, idx) => {
            // Combine correct and incorrect answers into one array with correctness flag and unique id
            let answerId = 0;
            const answers = [
                ...q.incorrect_answers.map(ans => ({ id: answerId++, text: ans, correct: false })),
                { id: answerId++, text: q.correct_answer, correct: true }
            ];
            // Shuffle answers array
            for (let i = answers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [answers[i], answers[j]] = [answers[j], answers[i]];
            }
            // Reassign ids after shuffle to ensure uniqueness per question
            answers.forEach((a, i) => a.id = i);
            return {
                id: idx, // Assign a unique id per question (or use a better unique id if available)
                question: q.question,
                answers: answers, // Array of { id, text, correct }
                category: q.category, // Add the category of the question
                difficulty: q.difficulty,
                location: this.generateQuestionLocation()
            };
        });
    }

    generateQuestionLocation() {
        // TODO: Implement logic to generate coordinates within game bounds
        return {
            lat: 0,
            lng: 0
        };
    }

    checkAnswer(questionId, answerId) {
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        return !!question && !!question.answers[answerId] && question.answers[answerId].correct;
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