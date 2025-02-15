

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASpIDZk1wFB_4ngFMR5v3J0y_nAL0G2Tw",
  authDomain: "memory-game-e7044.firebaseapp.com",
  databaseURL: "https://memory-game-e7044-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "memory-game-e7044",
  storageBucket: "memory-game-e7044.firebasestorage.app",
  messagingSenderId: "30560387508",
  appId: "1:30560387508:web:549de3d6276e61f40b72e1",
  measurementId: "G-EWRW6TZMHP"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let gameRoomId;
let playerId;

// DOM Elements
const boardElement = document.getElementById('board');
const player1ScoreElement = document.getElementById('player1-score');
const player2ScoreElement = document.getElementById('player2-score');
const turnElement = document.getElementById('turn');
const resetButton = document.getElementById('reset-button');

// Start the game
async function startGame() {
    await auth.signInAnonymously();
    playerId = auth.currentUser.uid;

    const urlParams = new URLSearchParams(window.location.search);
    gameRoomId = urlParams.get('gameRoomId');

    if (gameRoomId) {
        await joinGameRoom(gameRoomId);
    } else {
        gameRoomId = await createGameRoom();
        window.history.pushState({}, '', `?gameRoomId=${gameRoomId}`);
    }

    syncGameState(gameRoomId, (gameState) => {
        renderBoard(gameState.board);
        updateScores(gameState.playerScores);
        updateTurn(gameState.currentPlayer);
    });
}

// Create a new game room
async function createGameRoom() {
    const gameRoomRef = await db.collection('gameRooms').add({
        player1: playerId,
        player2: null,
        board: createBoard(),
        flippedCards: [],
        currentPlayer: 1,
        playerScores: { 1: 0, 2: 0 },
        lockBoard: false
    });
    return gameRoomRef.id;
}

// Join an existing game room
async function joinGameRoom(gameRoomId) {
    await db.collection('gameRooms').doc(gameRoomId).update({
        player2: playerId
    });
}

// Sync game state in real-time
function syncGameState(gameRoomId, callback) {
    db.collection('gameRooms').doc(gameRoomId).onSnapshot((doc) => {
        const gameState = doc.data();
        callback(gameState);
    });
}

// Create the game board
function createBoard() {
    const symbols = Array.from({ length: 8 }, (_, i) => i + 1).concat(Array.from({ length: 8 }, (_, i) => i + 1));
    symbols.sort(() => Math.random() - 0.5);
    return symbols.map(symbol => ({ symbol, flipped: false, matched: false }));
}

// Render the board
function renderBoard(board) {
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
async function flipCard(index) {
    const gameRoomRef = db.collection('gameRooms').doc(gameRoomId);
    const gameState = (await gameRoomRef.get()).data();

    if (gameState.lockBoard || gameState.board[index].flipped || gameState.board[index].matched || gameState.flippedCards.length === 2) return;

    gameState.board[index].flipped = true;
    gameState.flippedCards.push(index);

    await gameRoomRef.update({
        board: gameState.board,
        flippedCards: gameState.flippedCards
    });

    if (gameState.flippedCards.length === 2) {
        checkForMatch(gameRoomId, gameState);
    }
}

// Check for a match
async function checkForMatch(gameRoomId, gameState) {
    const [index1, index2] = gameState.flippedCards;
    const gameRoomRef = db.collection('gameRooms').doc(gameRoomId);

    if (gameState.board[index1].symbol === gameState.board[index2].symbol) {
        // Correct match
        gameState.board[index1].matched = true;
        gameState.board[index2].matched = true;
        gameState.playerScores[gameState.currentPlayer]++;
        gameState.flippedCards = [];

        await gameRoomRef.update({
            board: gameState.board,
            playerScores: gameState.playerScores,
            flippedCards: gameState.flippedCards
        });

        if (gameState.playerScores[1] + gameState.playerScores[2] === 8) {
            endGame(gameState);
        }
    } else {
        // Incorrect match
        gameState.lockBoard = true;
        await gameRoomRef.update({ lockBoard: true });

        setTimeout(async () => {
            gameState.board[index1].flipped = false;
            gameState.board[index2].flipped = false;
            gameState.flippedCards = [];
            gameState.lockBoard = false;
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;

            await gameRoomRef.update({
                board: gameState.board,
                flippedCards: gameState.flippedCards,
                lockBoard: gameState.lockBoard,
                currentPlayer: gameState.currentPlayer
            });
        }, 1500);
    }
}

// Update scores
function updateScores(playerScores) {
    player1ScoreElement.textContent = playerScores[1];
    player2ScoreElement.textContent = playerScores[2];
}

// Update turn display
function updateTurn(currentPlayer) {
    turnElement.textContent = `Player ${currentPlayer}'s Turn`;
    turnElement.className = `player${currentPlayer}-turn`;
}

// End the game
function endGame(gameState) {
    let winner = '';
    if (gameState.playerScores[1] > gameState.playerScores[2]) {
        winner = 'Player 1 wins!';
    } else if (gameState.playerScores[2] > gameState.playerScores[1]) {
        winner = 'Player 2 wins!';
    } else {
        winner = 'It\'s a tie!';
    }
    alert(`Game Over! ${winner}`);
}

// Reset the game
resetButton.addEventListener('click', async () => {
    await db.collection('gameRooms').doc(gameRoomId).delete();
    window.location.reload();
});

// Start the game
startGame();