# QuizWalk

QuizWalk is a web application that combines quizzes with geolocation-based gameplay. Players answer questions while navigating to specific locations on a map.

## Features

- **Dynamic Quizzes**: Fetches questions from the Open Trivia Database (https://opentdb.com/).
- **Geolocation Integration**: Each question is tied to a specific location.
- **User Progress Tracking**: Tracks active and completed quizzes.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quizwalk.git
   ```
2. Navigate to the project directory:
   ```bash
   cd quizwalk
   ```
3. Open the project in your preferred code editor.

## Usage

1. Open the `index.html` file in a web browser to start the application.
2. Select a quiz and begin answering questions.
3. Navigate to the locations associated with each question to earn points.

## Project Structure

- **js/quiz.js**: Contains the core logic for quizzes, questions, user progress, and quiz management.
- **css/**: Stylesheets for the application.
- **index.html**: Entry point for the application.

## API Integration

The application fetches quiz questions from the Open Trivia Database API:
- API URL: `https://opentdb.com/api.php`
- Parameters:
  - `amount`: Number of questions to fetch.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.