const config = {
  type: Phaser.AUTO,
  width: 300,
  height: 300,
  backgroundColor: '#f0f0f0',
  scene: {
    preload: preload,
    create: create
  }
};

const game = new Phaser.Game(config);
const cellSize = 100;
const boardSize = 3;

let scene;
let board = [];
let currentPlayer = 'X';



function preload() {
  scene = this;
}

function create() {
  initBoard();
  drawGrid();
  scene.input.on('pointerdown', handlePointerDown);
}

function initBoard() {
  board = [];
  for (let y = 0; y < boardSize; y++) {
    const row = [];
    for (let x = 0; x < boardSize; x++) {
      row.push('');
    }
    board.push(row);
  }
}

function drawGrid() {
  const graphics = scene.add.graphics({ lineStyle: { width: 2, color: 0x000000 } })
  for (let i = 1; i < boardSize; i++) {
    graphics.lineBetween(i * cellSize, 0, i * cellSize, cellSize * boardSize);
    graphics.lineBetween(0, i * cellSize, cellSize * boardSize, i * cellSize);
  }
}

function handlePointerDown(pointer) {
  const x = Math.floor(pointer.x / cellSize);
  const y = Math.floor(pointer.y / cellSize);

  if (board[y][x] == '') {
    placeMark(x, y, currentPlayer);
    if (checkWin(currentPlayer)) {
      showWinMessage(`${currentPlayer} wins!`);
      scene.input.off('pointerdown', handlePointerDown);
    } else if (checkDraw()) {
      showWinMessage("It's a draw!");
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
  }
}

function placeMark(x, y, player) {
  board[y][x] = player;
  scene.add.text(x * cellSize + 35, y * cellSize + 20, player, {
    fontSize: '48px',
    color: '#000'
  });
  console.log(getGameState());
}

function checkWin(player) {
  // Rows and columns
  for (let i = 0; i < boardSize; i++) {
    if (board[i].every(cell => cell === player)) return true;
    if (board.every(row => row[i] === player)) return true;
  }
  // Diagonals
  if (board.every((row, i) => row[i] === player)) return true;
  if (board.every((row, i) => row[boardSize - 1 - i] === player)) return true;

  return false;
}

function checkDraw() {
  return board.flat().every(cell => cell !== '');
}

function showWinMessage(message) {
  scene.add.rectangle(150, 150, 300, 60, 0xffffff).setStrokeStyle(2, 0x000000);
  scene.add.text(60, 135, message, {
    fontSize: '24px',
    color: '#000'
  });
}

function getGameState() {
  const turnNumber = board.flat().filter(cell => cell !== '').length;

  let status = 'playing';
  if (checkWin('X')) status = 'X_won';
  else if (checkWin('O')) status = 'O_won';
  else if (checkDraw()) status = 'draw';

  return {
    board: board.map(row => [...row]),
    currentPlayer: currentPlayer,
    turn: turnNumber,
    status: status
  };
}

function applyLLMMove(row, col) {
  console.log(`applying LLM move: O at (${row},${col})`);
  if (board[row][col] === '') {
    placeMark(row, col, currentPlayer);
    if (checkWin(currentPlayer)) {
      showWinMessage(`${currentPlayer} wins!`);
      scene.input.off('pointerdown', handlePointerDown);
    } else if (checkDraw()) {
      showWinMessage("It's a draw!");
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
  }
}

function calculateAvailableActions(board) {
  const actions = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === '') {
        if (board[r][c] === '') {
          actions.push({ row: r, col: c });
        }
      }
    }
  }
  return actions;
}

function triggerLLMMove() {
  console.log("triggerLLMMove started.");
  const currentState = getGameState();
  const availableActions = calculateAvailableActions(currentState.board);
  const userInstruction = document.getElementById('instruction').value;

  console.log("Current State:", JSON.stringify(currentState));
  console.log("Available Actions:", JSON.stringify(availableActions));
  console.log("User Instruction:", userInstruction);

  if (currentState.currentPlayer !== 'O') {
    alert("It's not the LLM's (O's) turn!");
    return; // Don't proceed
  }
  if (availableActions.length === 0 && currentState.status === 'playing') {
    alert("No available moves, but game state is 'playing'?");
    // This might indicate a draw wasn't detected properly earlier
    return;
  }
  if (currentState.status !== 'playing') {
    alert("Game is already over!");
    return;
  }

  console.log("Disabling button.");
  document.getElementById('submitInstruction').disabled = true;


  console.log("Sending fetch request to /api/llm_move...");
  fetch('/api/llm_move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameState: currentState,
      availableActions: availableActions,
      instruction: userInstruction
    })
  })

    .then(response => {
      console.log("Received response, status:", response.status, response.statusText);
      if (!response.ok) {
        return response.json().then(err => {
          console.log("Response not OK. Attempting to parse error JSON.");
          throw new Error(`Server error: ${response.status} - ${err.error || 'Unknown error'}`)
        });
      }
      console.log("Response OK. Parsing JSON.");
      return response.json();
    })

    .then(data => {
      console.log("Successfully parsed JSON data:", data);
      if (data.error) {
        console.error("Error message from server:", data.error);
        alert(`Error from LLM: ${data.error}`);
      } else if (data.row !== undefined && data.col !== undefined) {
        console.log("Received valid move:", data);
        applyLLMMove(data.row, data.col);
      } else {
        console.error("Unexpected response format from server:", data);
        alert("Unexpected response from server.");
      }
    })

    .catch(error => {
      console.error('LLM request failed:', error);
      alert(`Network or server error: ${error.message}`);
    })
    .finally(() => {
      console.log("Executing finally block. Re-enabling button.");
      document.getElementById('submitInstruction').disabled = false;
    })
  console.log("triggerLLMMove function finished (fetch is async).");

}


window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('submitInstruction').addEventListener('click', triggerLLMMove);
});