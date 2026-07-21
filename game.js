const boardElement = document.getElementById("board");
const difficultySelect = document.getElementById("difficulty");
const newGameButton = document.getElementById("newGameButton");
const mineCountElement = document.getElementById("mineCount");
const flagCountElement = document.getElementById("flagCount");
const timerElement = document.getElementById("timer");
const messageElement = document.getElementById("message");

const gemTap = new Audio("sounds/gem-tap.mp3");

gemTap.volume = 0.35;
gemTap.playbackRate = 2.0;

const meow = new Audio("sounds/meow.mp3");

meow.volume = 0.5;

const flagSound = new Audio("sounds/plant-flag.mp3");

flagSound.volume = 0.4;
flagSound.playbackRate = 1.15;

const winSound = new Audio("sounds/win-sound.mp3");
winSound.volume = 0.5;

const difficultySettings = {
    kitten: { rows: 10, columns: 16, mines:30 },
    housecat: { rows: 14, columns: 20, mines: 50 },
    bengal: { rows: 18, columns: 24, mines: 80 }
};

let board = [];
let rows = 8;
let columns = 8;
let totalMines = 10;
let flagsPlaced = 0;
let revealedSafeTiles = 0;
let gameOver = false;
let gameStarted = false;
let timerSeconds = 0;
let timerInterval = null;
let minesHaveBeenPlaced = false;

function createEmptyBoard() {
    return Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => ({
            row,
            column,
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            nearbyMines: 0
        }))
    );
}

function placeMines(safeRow, safeColumn) {
    let minesPlaced = 0;

    while (minesPlaced < totalMines) {
        const row = Math.floor(Math.random() * rows);
        const column = Math.floor(Math.random() * columns);
        const tile = board[row][column];

        const isInsideSafeArea =
            Math.abs(row - safeRow) <= 1 &&
            Math.abs(column - safeColumn) <= 1;

        if (!tile.isMine && !isInsideSafeArea) {
            tile.isMine = true;
            minesPlaced++;
        }
    }

    minesHaveBeenPlaced = true;
}

function countNearbyMines(row, column) {
    let count = 0;

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            if (rowOffset === 0 && columnOffset === 0) continue;

            const nearbyRow = row + rowOffset;
            const nearbyColumn = column + columnOffset;

            if (
                nearbyRow >= 0 &&
                nearbyRow < rows &&
                nearbyColumn >= 0 &&
                nearbyColumn < columns &&
                board[nearbyRow][nearbyColumn].isMine
            ) {
                count++;
            }
        }
    }

    return count;
}

function calculateNumbers() {
    for (const row of board) {
        for (const tile of row) {
            if (!tile.isMine) {
                tile.nearbyMines = countNearbyMines(tile.row, tile.column);
            }
        }
    }
}

function startTimer() {
    if (gameStarted) return;

    gameStarted = true;
    timerInterval = setInterval(() => {
        timerSeconds++;
        timerElement.textContent = timerSeconds;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function renderBoard() {
    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns = `repeat(${columns}, var(--tile-size))`;

    for (const row of board) {
        for (const tile of row) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tile";
            button.dataset.row = tile.row;
            button.dataset.column = tile.column;
            button.setAttribute("aria-label", `Hidden square, row ${tile.row + 1}, column ${tile.column + 1}`);

            let clickTimer = null;

            button.addEventListener("click", () => {
                clearTimeout(clickTimer);

                clickTimer = setTimeout(() => {
                    revealTile(tile.row, tile.column);
                }, 250);
            });

            button.addEventListener("dblclick", event => {
                event.preventDefault();
                clearTimeout(clickTimer);
                toggleFlag(tile.row, tile.column);
            });
            boardElement.appendChild(button);
        }
    }
}

function addLongPressControls(button, row, column) {
    let pressTimer = null;
    let longPressTriggered = false;

    const beginPress = event => {
        if (event.pointerType === "mouse") return;

        longPressTriggered = false;
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            toggleFlag(row, column);
        }, 500);
    };

    const endPress = event => {
        clearTimeout(pressTimer);

        if (longPressTriggered) {
            event.preventDefault();
        }
    };

    button.addEventListener("pointerdown", beginPress);
    button.addEventListener("pointerup", endPress);
    button.addEventListener("pointercancel", endPress);
    button.addEventListener("pointerleave", endPress);
}

function getTileElement(row, column) {
    return boardElement.querySelector(`[data-row="${row}"][data-column="${column}"]`);
}

function updateTileDisplay(tile) {
    const element = getTileElement(tile.row, tile.column);
    if (!element) return;

    element.className = "tile";
    element.textContent = "";

    if (tile.isFlagged && !tile.isRevealed) {
        element.classList.add("flagged");

        const flagImage = document.createElement("img");
        flagImage.src = "images/piotr-flag.png";   // change to your filename
        flagImage.alt = "";
        flagImage.classList.add("flag-image");

        element.appendChild(flagImage);

        element.setAttribute(
            "aria-label",
            `Piotr flag on row ${tile.row + 1}, column ${tile.column + 1}`
        );
        return;
    }

    if (!tile.isRevealed) return;

    element.classList.add("revealed");

    if (tile.isMine) {
    element.classList.add("mine");

    const catImage = document.createElement("img");
    catImage.src = "images/pushka.jpg";
    catImage.alt = "";
    catImage.classList.add("cat-bomb-image");

    element.appendChild(catImage);

    element.setAttribute("aria-label", "Pushka revealed");
} else if (tile.nearbyMines > 0) {
        element.textContent = tile.nearbyMines;
        element.classList.add(`number-${tile.nearbyMines}`);
        element.setAttribute("aria-label", `${tile.nearbyMines} cats nearby`);
    } else {
        const img = document.createElement("img");
        img.src = "images/diamond.jpg";
        img.alt = "";
        img.classList.add("empty-tile-image");

        element.appendChild(img);

        element.setAttribute("aria-label", "Safe empty square");
    }
}

function revealTile(row, column) {
    if (gameOver) return;
 
    const tile = board[row][column];

    if (tile.isRevealed || tile.isFlagged) return;

    gemTap.currentTime = 0;
    gemTap.play();

    if (!minesHaveBeenPlaced) {
        placeMines(row, column);
        calculateNumbers();
    }

    startTimer();
    tile.isRevealed = true;
    updateTileDisplay(tile);

    if (tile.isMine) {

        meow.currentTime = 0;
        meow.play();

        loseGame();
        return;
    }

    revealedSafeTiles++;

    if (tile.nearbyMines === 0) {
        revealNearbyTiles(row, column);
    }

    checkForWin();
}

function revealNearbyTiles(row, column) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            if (rowOffset === 0 && columnOffset === 0) {
                continue;
            }

            const nearbyRow = row + rowOffset;
            const nearbyColumn = column + columnOffset;

            const isInsideBoard =
                nearbyRow >= 0 &&
                nearbyRow < rows &&
                nearbyColumn >= 0 &&
                nearbyColumn < columns;

            if (!isInsideBoard) {
                continue;
            }

            const nearbyTile = board[nearbyRow][nearbyColumn];

            if (
                nearbyTile.isRevealed ||
                nearbyTile.isFlagged ||
                nearbyTile.isMine
            ) {
                continue;
            }

            nearbyTile.isRevealed = true;
            revealedSafeTiles++;
            updateTileDisplay(nearbyTile);

            // Continue spreading only through empty diamond tiles.
            // Numbered tiles are revealed but do not spread farther.
            if (nearbyTile.nearbyMines === 0) {
                revealNearbyTiles(nearbyRow, nearbyColumn);
            }
        }
    }
}

function toggleFlag(row, column) {
    if (gameOver) return;

    const tile = board[row][column];
    if (tile.isRevealed) return;

    startTimer();

    if (!tile.isFlagged && flagsPlaced >= totalMines) {
        messageElement.textContent = "You have already used all of your Piotr flags.";
        return;
    }

    tile.isFlagged = !tile.isFlagged;
    flagsPlaced += tile.isFlagged ? 1 : -1;

    flagSound.currentTime = 0;
    flagSound.play();

    flagCountElement.textContent = flagsPlaced;
    updateTileDisplay(tile);
}

function revealAllMines() {
    for (const row of board) {
        for (const tile of row) {
            if (tile.isMine) {
                tile.isRevealed = true;
                updateTileDisplay(tile);
            }
        }
    }
}

function loseGame() {
    gameOver = true;
    stopTimer();
    revealAllMines();
    messageElement.textContent = "You disturbed the cats! Tap New Game to try again.";
}

function checkForWin() {
    const safeTileCount = rows * columns - totalMines;

    if (revealedSafeTiles === safeTileCount) {
        gameOver = true;
        stopTimer();
        winSound.currentTime = 0;
        winSound.play();
        celebrateWin();
        
        messageElement.textContent = "You found every safe square! Piotr successfully flagged the cats!";
    }
}

function startNewGame() {
    const settings = difficultySettings[difficultySelect.value];

    rows = settings.rows;
    columns = settings.columns;
    totalMines = settings.mines;
    flagsPlaced = 0;
    revealedSafeTiles = 0;
    gameOver = false;
    gameStarted = false;
    timerSeconds = 0;
    minesHaveBeenPlaced = false;

    stopTimer();
    mineCountElement.textContent = totalMines;
    flagCountElement.textContent = "0";
    timerElement.textContent = "0";
    messageElement.textContent =
    "Tap a square to reveal it. Double-click to place a Piotr flag.";

    board = createEmptyBoard();
    renderBoard();
    
}

function celebrateWin() {
    const pictures = [
        "images/1.jpg",
        "images/2.jpg",
        "images/3.jpg",
        "images/4.jpg",
        "images/5.jpg",
        "images/6.jpg"
    ];

    for (const row of board) {
        for (const tile of row) {
            if (!tile.isMine) {
                const element = getTileElement(tile.row, tile.column);

                element.innerHTML = "";

                const img = document.createElement("img");
                img.src = pictures[Math.floor(Math.random() * pictures.length)];
                img.classList.add("win-picture");

                element.appendChild(img);
            }
        }
    }
}

newGameButton.addEventListener("click", startNewGame);
difficultySelect.addEventListener("change", startNewGame);

startNewGame();
