const boardElement = document.getElementById('board');
const player1ScoreElement = document.getElementById('player1-score');
const player2ScoreElement = document.getElementById('player2-score');
const turnElement = document.getElementById('turn');
const resetButton = document.getElementById('reset-button');

let board = [];
let flippedCards = [];
let currentPlayer = 1;
let playerScores = { 1: 0, 2: 0 };
let lockBoard = false;

// Firebase Realtime Database reference
const gameRef = firebase.ref(firebase.database, 'game');

// Initialize the game
function initGame() {
    board = createBoard();
    renderBoard();
    playerScores = { 1: 0, 2: 0 };
    currentPlayer = 1;
    updateScores();
    updateTurn();

    // Sync game state with Firebase
    firebase.set(gameRef, {
        board: board,
        flippedCards: flippedCards,
        currentPlayer: currentPlayer,
        playerScores: playerScores,
        lockBoard: lockBoard
    });
}

// Create the game board
function createBoard() {
    const symbols = Array.from({ length: 8 }, (_, i) => i + 1).concat(Array.from({ length: 8 }, (_, i) => i + 1));
    symbols.sort(() => Math.random() - 0.5);
    return symbols.map(symbol => ({ symbol, flipped: false, matched: false }));
}

// Render the board
function renderBoard() {
    boardElement.innerHTML = '';
    board.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        if (card.flipped || card.matched) {
            cardElement.classList.add('flipped');
        }
        if (card.matched) {
            cardElement.classList.add('matched');
        }

        const front = document.createElement('div');
        front.classList.add('front');
        front.textContent = card.symbol;

        const back = document.createElement('div');
        back.classList.add('back');

        cardElement.appendChild(front);
        cardElement.appendChild(back);

        cardElement.addEventListener('click', () => flipCard(index));
        boardElement.appendChild(cardElement);
    });
}

// Flip a card
function flipCard(index) {
    if (lockBoard || board[index].flipped || board[index].matched || flippedCards.length === 2) return;

    board[index].flipped = true;
    flippedCards.push(index);
    renderBoard();

    // Update Firebase
    firebase.update(gameRef, {
        board: board,
        flippedCards: flippedCards
    });

    if (flippedCards.length === 2) {
        checkForMatch();
    }
}

// Check for a match
function checkForMatch() {
    const [index1, index2] = flippedCards;
    if (board[index1].symbol === board[index2].symbol) {
        // Correct match
        setTimeout(() => {
            board[index1].matched = true;
            board[index2].matched = true;
            flippedCards = [];
            renderBoard();
            playerScores[currentPlayer]++;
            updateScores();
            if (playerScores[1] + playerScores[2] === 8) {
                endGame();
            }

            // Update Firebase
            firebase.update(gameRef, {
                board: board,
                flippedCards: flippedCards,
                playerScores: playerScores
            });
        }, 1000); // Wait 1 second before hiding matched cards
    } else {
        // Incorrect match
        lockBoard = true;
        setTimeout(() => {
            board[index1].flipped = false;
            board[index2].flipped = false;
            flippedCards = [];
            renderBoard();
            lockBoard = false;
            switchPlayer();

            // Update Firebase
            firebase.update(gameRef, {
                board: board,
                flippedCards: flippedCards,
                currentPlayer: currentPlayer,
                lockBoard: lockBoard
            });
        }, 1500); // Slow down flip for incorrect answers
    }
}

// Switch players
function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateTurn();
}

// Update scores
function updateScores() {
    player1ScoreElement.textContent = playerScores[1];
    player2ScoreElement.textContent = playerScores[2];
}

// Update turn display
function updateTurn() {
    turnElement.textContent = `Player ${currentPlayer}'s Turn`;
    turnElement.className = `player${currentPlayer}-turn`;
}

// End the game
function endGame() {
    let winner = '';
    if (playerScores[1] > playerScores[2]) {
        winner = 'Player 1 wins!';
    } else if (playerScores[2] > playerScores[1]) {
        winner = 'Player 2 wins!';
    } else {
        winner = 'It\'s a tie!';
    }
    alert(`Game Over! ${winner}`);
}

// Reset the game
resetButton.addEventListener('click', initGame);

// Listen for real-time updates from Firebase
firebase.onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        board = data.board;
        flippedCards = data.flippedCards;
        currentPlayer = data.currentPlayer;
        playerScores = data.playerScores;
        lockBoard = data.lockBoard;
        renderBoard();
        updateScores();
        updateTurn();
    }
});

// Start the game
initGame(); 