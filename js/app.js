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
    const locationManager = new LocationManager(); // Add LocationManager for distance calculation
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
    const distanceSpan = document.getElementById('distance'); // New element

    let currentUser = null;
    let quizCompleted = false; // Add a flag to track quiz completion

    // Helper to decode HTML entities
    function decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    // Show quiz options - hide category selection, only show amount selection
    function showQuizOptions(show) {
        // Always hide category selection
        document.getElementById('category-selection').style.display = 'none';
        // Don't use amount-selection div anymore since we moved amount to admin
    }

    // On page load, show quiz options (category will be hidden)
    showQuizOptions(true);

    // Initialize StorageManager, QuizManager, and LocationManager
    storageManager.init().then(() => {
        quizManager.init(); // This loads the global quiz state if it exists
        locationManager.init();
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
            
            // Show category and amount selection when user logs in
            showQuizOptions(true);

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
        showQuizOptions(false);
    });

    // Start a new game
    startGameBtn.addEventListener('click', () => {
        // Remove any check for amount-selection display
        if (!quizManager.currentQuiz) {
            alert('Please create a quiz first!');
            return;
        }

        // Otherwise proceed with quiz creation
        quizCompleted = false;
        currentScore.textContent = "0";
        scoreDisplay.classList.remove('hidden');
        finalScoreDisplay.classList.add('hidden');

        displayQuestion(0);
        
        // Hide quiz options when quiz starts
        showQuizOptions(false);
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

        // Show the question section
        questionSection.classList.remove('hidden');
        
        // Start tracking location and listen for position changes
        locationManager.stopTracking(); // Stop any existing tracking
        
        // Check if question has a location and handle proximity
        if (question.location && question.location.lat && question.location.lng) {
            // Set up content for "get closer" message
            questionText.textContent = "Get closer to the location to see the question!";
            answerOptions.innerHTML = '';
            
            // Create a function to check proximity and update UI accordingly
            const checkProximityAndUpdate = (position) => {
                const targetPoint = { lat: question.location.lat, lng: question.location.lng };
                const distance = locationManager.calculateDistance(position, targetPoint);
                
                // Update distance display
                distanceSpan.textContent = Math.round(distance);
                
                // Check if user is within proximity
                const isClose = distance <= locationManager.proximityRadius;
                
                if (isClose) {
                    // User is close enough, show the actual question
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
                } else {
                    // Ensure we always show "get closer" message when not in proximity
                    questionText.textContent = "Get closer to the location to see the question!";
                    answerOptions.innerHTML = '';
                }
            };
            
            // Add listener for position changes
            locationManager.addEventListener('positionChanged', checkProximityAndUpdate);
            
            // Start tracking
            locationManager.startTracking().then(() => {
                // Initial check with current position
                locationManager.getCurrentPosition().then(pos => {
                    checkProximityAndUpdate(pos);
                }).catch(error => {
                    console.error("Error getting position:", error);
                });
            });
        } else {
            // Question doesn't have location, show it immediately
            questionText.textContent = decodeHtml(question.question);
            answerOptions.innerHTML = '';
            
            question.answers.forEach((answer) => {
                const button = document.createElement('button');
                button.textContent = decodeHtml(answer.text);
                button.classList.add('btn');
                button.dataset.answerId = answer.id;
                button.addEventListener('click', () => handleAnswer(index, answer.id));
                answerOptions.appendChild(button);
            });
        }
    }

    // Update the distance indicator to the current question
    function updateDistanceToQuestion(questionIndex) {
        if (!quizManager.currentQuiz || !quizManager.currentQuiz.questions[questionIndex]) {
            distanceSpan.textContent = '--';
            return;
        }
        const question = quizManager.currentQuiz.questions[questionIndex];
        if (!question.location || typeof question.location.lat !== 'number' || typeof question.location.lng !== 'number') {
            distanceSpan.textContent = '--';
            return;
        }
        // Get current position and update distance
        locationManager.getCurrentPosition().then(pos => {
            const dist = locationManager.calculateDistance(
                { lat: pos.lat, lng: pos.lng },
                { lat: question.location.lat, lng: question.location.lng }
            );
            distanceSpan.textContent = Math.round(dist);
        }).catch(() => {
            distanceSpan.textContent = '--';
        });
    }

    // Optionally, update distance live as user moves
    function startDistanceTracking(questionIndex) {
        if (locationManager.watchId) {
            locationManager.stopTracking();
        }
        locationManager.startTracking().then(() => {
            // Patch: listen for position changes
            navigator.geolocation.watchPosition(
                () => updateDistanceToQuestion(questionIndex),
                () => {},
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
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

        // 7. Move to next question or finish quiz
        if (index + 1 < quizManager.currentQuiz.questions.length) {
            // Stop current tracking before moving to next question
            locationManager.stopTracking();
            
            // Move to next question which will handle its own proximity check
            displayQuestion(index + 1);
        } else {
            quizCompleted = true;
            const completedQuiz = quizManager.currentQuiz; 
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
            
            // Keep category and amount selection hidden after quiz completion
            showQuizOptions(false);
        }
    }

    // --- ADMIN/QUIZ CREATION: Assign question locations via map click ---

    let mapAssignmentVisible = false;
    let mapInstance = null;

    function enableQuestionLocationAssignment(quizQuestions) {
        // Use LocationManager to get current location and draw map
        const locationManager = new LocationManager();

        // Create map container if not present
        let mapContainer = document.getElementById('map');
        if (!mapContainer) {
            mapContainer = document.createElement('div');
            mapContainer.id = 'map';
            mapContainer.style = 'width: 100%; height: 400px; margin: 20px 0;';
            document.body.prepend(mapContainer);
        }

        // Helper to initialize map at a given location
        function initMap(lat, lng) {
            // If map already exists, remove it
            if (mapInstance) {
                mapInstance.remove();
            }
            mapInstance = L.map('map').setView([lat, lng],17);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapInstance);
            
            // Add a custom control to center the map on current location
            const centerControl = L.control({ position: 'topleft' });
            centerControl.onAdd = function() {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                div.innerHTML = `<a href="#" title="Center on current position" style="font-weight: bold; display: flex; width: 30px; height: 30px; line-height: 30px; text-align: center; justify-content: center; align-items: center;">📍</a>`;
                
                div.onclick = async function(e) {
                    e.preventDefault();
                    try {
                        const pos = await locationManager.getCurrentPosition();
                        mapInstance.setView([pos.lat, pos.lng], mapInstance.getZoom());
                    } catch (err) {
                        alert('Could not get your current position.');
                    }
                    return false;
                };
                return div;
            };
            centerControl.addTo(mapInstance);
            
            return mapInstance;
        }

        // Use LocationManager to get current position, fallback to Stockholm
        function startMap() {
            locationManager.init().then(() => {
                locationManager.getCurrentPosition().then(pos => {
                    setupMapAndUI(pos.lat, pos.lng);
                }).catch(() => {
                    setupMapAndUI(59.3293, 18.0686);
                });
            }).catch(() => {
                setupMapAndUI(59.3293, 18.0686);
            });
        }

        function setupMapAndUI(lat, lng) {
            let map = initMap(lat, lng);

            // List questions for assignment
            let questionList = document.getElementById('question-list');
            if (!questionList) {
                questionList = document.createElement('ul');
                questionList.id = 'question-list';
                questionList.style = 'margin: 20px 0;';
                document.body.insertBefore(questionList, mapContainer.nextSibling);
            }
            questionList.innerHTML = '';
            quizQuestions.forEach((q, idx) => {
                const li = document.createElement('li');
                li.textContent = `Q${idx + 1}`;
                li.style.cursor = 'pointer';
                li.dataset.index = idx;
                if (q.location && q.location.lat && q.location.lng) {
                    li.style.color = 'green';
                    li.title = `Assigned: (${q.location.lat.toFixed(5)}, ${q.location.lng.toFixed(5)})`;
                }
                questionList.appendChild(li);
            });

            // Highlight selected question
            let selectedIdx = 0;
            function highlightSelected() {
                Array.from(questionList.children).forEach((li, idx) => {
                    li.style.fontWeight = (idx === selectedIdx) ? 'bold' : 'normal';
                    li.style.background = (idx === selectedIdx) ? '#e0f0ff' : '';
                });
            }
            highlightSelected();

            // Allow selecting a question
            questionList.addEventListener('click', (e) => {
                if (e.target.tagName === 'LI') {
                    selectedIdx = parseInt(e.target.dataset.index, 10);
                    highlightSelected();
                }
            });

            // Marker management
            let markers = [];

            // On map click, assign location to selected question
            map.on('click', function(e) {
                const { lat, lng } = e.latlng;
                quizQuestions[selectedIdx].location = { lat, lng };

                // Remove old marker for this question if exists
                if (markers[selectedIdx]) {
                    map.removeLayer(markers[selectedIdx]);
                }
                // Place marker
                const marker = L.marker([lat, lng]).addTo(map)
                    .bindPopup(`Q${selectedIdx + 1}`).openPopup();
                markers[selectedIdx] = marker;

                // Update question list color/title
                const li = questionList.children[selectedIdx];
                li.style.color = 'green';
                li.title = `Assigned: (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
            });

            // Save/Update button
            let saveLocationsButton = document.getElementById('save-quiz-btn');
            if (!saveLocationsButton) {
                saveLocationsButton = document.createElement('button');
                saveLocationsButton.id = 'save-quiz-btn';
                saveLocationsButton.textContent = 'Save Quiz Locations';
                saveLocationsButton.className = 'btn';
                saveLocationsButton.style = 'margin: 20px 0;';
                document.getElementById('admin-controls').appendChild(saveLocationsButton);
            }
            saveLocationsButton.onclick = function() {
                // Persist updated quiz with locations to localStorage using StorageManager
                if (quizManager.currentQuiz) {
                    quizManager.currentQuiz.questions = quizQuestions;
                    storageManager.saveGameState(quizManager.currentQuiz);
                    alert('Quiz locations saved to local storage!');
                } else {
                    alert('No quiz loaded to save.');
                }
            };
        }

        startMap();
        // Show map and related UI
        mapContainer.style.display = '';
        let questionList = document.getElementById('question-list');
        if (questionList) questionList.style.display = '';
        let saveBtn = document.getElementById('save-quiz-btn');
        if (saveBtn) saveBtn.style.display = '';
    }

    function hideQuestionLocationAssignment() {
        let mapContainer = document.getElementById('map');
        if (mapContainer) mapContainer.style.display = 'none';
        let questionList = document.getElementById('question-list');
        if (questionList) questionList.style.display = 'none';
        let saveBtn = document.getElementById('save-quiz-btn');
        if (saveBtn) saveBtn.style.display = 'none';
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
        }
    }

    // Add handler for the Assign Locations button (toggle)
    const assignLocationsBtn = document.getElementById('assignLocationsBtn');
    if (assignLocationsBtn) {
        assignLocationsBtn.addEventListener('click', () => {
            mapAssignmentVisible = !mapAssignmentVisible;
            if (mapAssignmentVisible) {
                if (quizManager.currentQuiz && quizManager.currentQuiz.questions) {
                    enableQuestionLocationAssignment(quizManager.currentQuiz.questions);
                    assignLocationsBtn.textContent = 'Hide Question Locations Map';
                } else {
                    alert('No quiz loaded. Start a new game to load questions first.');
                    mapAssignmentVisible = false;
                }
            } else {
                hideQuestionLocationAssignment();
                assignLocationsBtn.textContent = 'Assign Question Locations (Admin)';
            }
        });
    }

    // Add handler for admin toggle button
    const toggleAdminBtn = document.getElementById('toggleAdminBtn');
    const adminControls = document.getElementById('admin-controls');
    
    if (toggleAdminBtn && adminControls) {
        toggleAdminBtn.addEventListener('click', () => {
            const isHidden = adminControls.classList.contains('hidden');
            
            if (isHidden) {
                adminControls.classList.remove('hidden');
                toggleAdminBtn.textContent = 'Hide Admin Controls';
            } else {
                adminControls.classList.add('hidden');
                toggleAdminBtn.textContent = 'Show Admin Controls';
            }
        });
    }

    // Initialize admin controls - regardless of visibility
    const amountInput = document.getElementById('amount');
    const createQuizBtn = document.getElementById('createQuizBtn');
    const discardQuizBtn = document.getElementById('discardQuizBtn');

    // When checking for amount in createQuizBtn handler, make sure we're using the correct reference
    if (createQuizBtn) {
        createQuizBtn.addEventListener('click', async () => {
            // Show loading indicator
            createQuizBtn.disabled = true;
            createQuizBtn.textContent = "Creating...";

            try {
                // Get selected amount directly from amountInput
                let amount = parseInt(amountInput.value, 10);
                if (isNaN(amount) || amount < 1) amount = 10;
                if (amount > 49) amount = 49;

                // Fetch questions - categories parameter is ignored in the new implementation
                const questions = await quizManager.fetchQuestions(amount, []);
                
                if (questions.length === 0) {
                    alert('Failed to get questions. Please try again.');
                    return;
                }

                // Create new quiz instance
                const newQuizId = Date.now();
                quizManager.currentQuiz = new Quiz(newQuizId, questions);
                quizManager.saveCurrentQuiz();

                // Initialize user progress for this quiz
                userProgress.startQuiz(newQuizId);
                
                // Reset quiz state
                quizCompleted = false;
                
                // Reset UI components but don't show question yet
                questionSection.classList.add('hidden');
                scoreDisplay.classList.add('hidden');
                currentScore.textContent = "0";
                
                alert(`Quiz created with ${questions.length} questions! Click "Start Game" to begin.`);
            } catch (error) {
                console.error("Error creating quiz:", error);
                alert("An error occurred while creating the quiz. Please try again.");
            } finally {
                createQuizBtn.disabled = false;
                createQuizBtn.textContent = "Create Quiz";
            }
        });
    }
});
