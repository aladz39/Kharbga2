// game.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// إعداد Supabase
const SUPABASE_URL = 'https://czmvghwmiaxxyykgcfaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bXZnaHdtaWF4eHl5a2djZmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3MjQsImV4cCI6MjA4NTMwMjcyNH0.-A_XCsnqg59s5pLbI1klpicK4GvG1GuEOV8U04W3pE0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// المتغيرات
const boardSize = 49;
let boardState = Array(boardSize).fill(null);
let currentPlayer = 'red';
let placementPhase = true;
let piecesCount = { red: 24, blue: 24 };
let placementsThisTurn = 0;
let mode = '';
let roomId = null;
let playerName = 'player' + Math.floor(Math.random() * 10000);
let isPlayerTurn = true;

const boardDiv = document.getElementById('board');
const statusText = document.getElementById('status');
const levelBox = document.getElementById('levelBox');
const moveSound = document.getElementById('moveSound');

const holes = [];
let selected = null;

const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const countdownDisplay = document.getElementById('countdown');

export function setMode(selectedMode) {
  mode = selectedMode;
}

export function initGame() {
  resetVariables();
  setupBoard();
  if (mode === 'online') {
    joinOnlineGame();
  } else {
    isPlayerTurn = true;
    drawBoard();
    if (mode === 'ai' && currentPlayer === 'blue' && placementPhase) {
      setTimeout(aiPlacePieces, 800);
    }
  }
}

function resetVariables() {
  boardState = Array(boardSize).fill(null);
  currentPlayer = 'red';
  placementPhase = true;
  piecesCount = { red: 24, blue: 24 };
  placementsThisTurn = 0;
  roomId = null;
  selected = null;
  isPlayerTurn = true;
  loadingOverlay.classList.remove('active');
  loadingText.textContent = '';
  countdownDisplay.textContent = '';
}

function setupBoard() {
  boardDiv.innerHTML = '';
  holes.length = 0;
  for (let i = 0; i < boardSize; i++) {
    const hole = document.createElement('div');
    hole.className = 'hole';
    if (i === 24) hole.classList.add('center');
    hole.dataset.index = i;
    hole.onclick = () => handleClick(i);
    boardDiv.appendChild(hole);
    holes.push(hole);
  }
  drawBoard();
}

function drawBoard() {
  holes.forEach((hole, i) => {
    hole.innerHTML = '';
    hole.classList.remove('selected');
    if (boardState[i]) {
      const piece = document.createElement('div');
      piece.className = 'piece ' + boardState[i];
      hole.appendChild(piece);
    }
  });
  if (selected !== null) holes[selected].classList.add('selected');
  updateStatus();
}

function updateStatus() {
  if (placementPhase) {
    statusText.textContent = `${currentPlayer === 'red' ? 'أنت الأحمر' : 'الخصم الأزرق'}: ضع حجرتين`;
  } else {
    statusText.textContent = isPlayerTurn ? 'دورك' : 'دور الخصم';
  }
  if (mode === 'online') {
    levelBox.textContent = `اللعب أونلاين`;
  } else {
    levelBox.textContent = '';
  }
}

async function handleClick(i) {
  if (mode === 'online' && !isPlayerTurn) return;
  if (mode === 'ai' && currentPlayer === 'blue') return;

  if (placementPhase) {
    placePiece(i);
  } else {
    movePiece(i);
  }
}

async function placePiece(i) {
  if (boardState[i] || i === 24) return;

  boardState[i] = currentPlayer;
  piecesCount[currentPlayer]--;
  placementsThisTurn++;

  playMoveSound();
  drawBoard();

  if (placementsThisTurn === 2) {
    placementsThisTurn = 0;
    if (piecesCount.red <= 0 && piecesCount.blue <= 0) {
      placementPhase = false;
      currentPlayer = 'red';
      statusText.textContent = 'بدأت المعركة! دورك.';
      isPlayerTurn = true;
    } else {
      switchTurn();
      if (mode === 'ai' && currentPlayer === 'blue') {
        setTimeout(aiPlacePieces, 800);
      }
    }
  }

  if (mode === 'online') await sendGameState();
}

async function aiPlacePieces() {
  if (currentPlayer !== 'blue' || !placementPhase) return;

  for (let count = 0; count < 2; count++) {
    let attempts = 0;
    while (attempts < 100) {
      const pos = Math.floor(Math.random() * boardSize);
      if (!boardState[pos] && pos !== 24) {
        boardState[pos] = 'blue';
        piecesCount.blue--;
        placementsThisTurn++;
        playMoveSound();
        drawBoard();
        break;
      }
      attempts++;
    }
    await new Promise(res => setTimeout(res, 600));
  }

  if (piecesCount.blue <= 0 && piecesCount.red <= 0) {
    placementPhase = false;
    currentPlayer = 'red';
    placementsThisTurn = 0;
    statusText.textContent = 'بدأت المعركة! دورك.';
    isPlayerTurn = true;
  } else {
    switchTurn();
  }
}

async function movePiece(i) {
  if (selected === null) {
    if (boardState[i] === currentPlayer) {
      selected = i;
      drawBoard();
    }
    return;
  }

  if (!isValidMove(selected, i)) {
    selected = null;
    drawBoard();
    return;
  }

  boardState[i] = currentPlayer;
  boardState[selected] = null;
  selected = null;

  playMoveSound();
  drawBoard();
  capturePieces(i);

  if (checkWin()) {
    alert(currentPlayer === 'red' ? 'فزت!' : 'خسرت!');
    resetGame();
    return;
  }

  switchTurn();

  if (mode === 'online') await sendGameState();
  if (mode === 'ai' && currentPlayer === 'blue') {
    setTimeout(aiMove, 800);
  }
}

function isValidMove(from, to) {
  if (boardState[to]) return false;
  const diff = Math.abs(to - from);
  return diff === 1 || diff === 7;
}

function capturePieces(pos) {
  const directions = [1, -1, 7, -7];
  directions.forEach(d => {
    const mid = pos + d;
    const end = pos + 2 * d;
    if (
      boardState[mid] && boardState[mid] !== currentPlayer &&
      boardState[end] === currentPlayer
    ) {
      boardState[mid] = null;
    }
  });
}

function switchTurn() {
  placementsThisTurn = 0;
  currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
  if (mode === 'online') {
    isPlayerTurn = !isPlayerTurn;
  } else {
    isPlayerTurn = currentPlayer === 'red';
  }
  drawBoard();
}

function checkWin() {
  if (!boardState.includes('red')) return true;
  if (!boardState.includes('blue')) return true;
  return false;
}

function aiMove() {
  if (currentPlayer !== 'blue') return;

  for (let i = 0; i < boardSize; i++) {
    if (boardState[i] === 'blue') {
      const moves = [i + 1, i - 1, i + 7, i - 7];
      for (const m of moves) {
        if (m >= 0 && m < boardSize && !boardState[m]) {
          boardState[m] = 'blue';
          boardState[i] = null;
          capturePieces(m);
          switchTurn();
          drawBoard();
          setTimeout(() => {
            if (currentPlayer === 'blue') {
              aiMove();
            }
          }, 600);
          return;
        }
      }
    }
  }
  switchTurn();
}

// ارسال حالة اللعبة
async function sendGameState() {
  if (!roomId) return;
  const { error } = await supabase
    .from('rooms')
    .update({
      board: JSON.stringify(boardState),
      turn: currentPlayer
    })
    .eq('id', roomId);
  if (error) console.error('خطأ في إرسال حالة اللعبة:', error);
}

// استقبال تحديثات اللعبة
function listenGameState() {
  if (!roomId) return;
  supabase
    .from(`rooms:id=eq.${roomId}`)
    .on('UPDATE', payload => {
      const newBoard = JSON.parse(payload.new.board);
      const newTurn = payload.new.turn;

      boardState = newBoard;
      currentPlayer = newTurn;

      // تبسيط: جعل اللاعب صاحب اللون "red" هو player1، "blue" player2
      isPlayerTurn = (playerName === (currentPlayer === 'red' ? payload.new.player1 : payload.new.player2));

      drawBoard();

      // لو انتهى الانتظار، إخفاء الساعة الرملية
      if (payload.new.player2) {
        showLoading(false);
      }
    })
    .subscribe();
}

// الانضمام للعبة اونلاين
async function joinOnlineGame() {
  showLoading(true, "انتظار لاعب آخر...");

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .is('player2', null)
    .limit(1);

  if (error) {
    console.error('خطأ في جلب الغرف:', error);
    showLoading(false);
    return;
  }

  if (rooms.length === 0) {
    const { data, error: insertError } = await supabase
      .from('rooms')
      .insert([{
        player1: playerName,
        player2: null,
        board: JSON.stringify(board
        

 }
const musicToggle = document.getElementById('musicToggle');
const backgroundMusic = document.getElementById('backgroundMusic');

let musicPlaying = false;

musicToggle.addEventListener('click', () => {
  if (musicPlaying) {
    backgroundMusic.pause();
    musicToggle.textContent = '🔇 إيقاف الموسيقى';
  } else {
    backgroundMusic.play();
    musicToggle.textContent = '🔊 تشغيل الموسيقى';
  }
  musicPlaying = !musicPlaying;
});
const levelDisplay = document.getElementById('levelDisplay');

let level = 0;
const maxLevel = 99;
const totalDuration = 60000; // 60 ثانية لتصل لـ 99

let startTime = null;

function easeOutQuad(t) {
  return t * (2 - t);
}

function updateLevel(timestamp) {
  if (!startTime) startTime = timestamp;
  let elapsed = timestamp - startTime;

  let progress = Math.min(elapsed / totalDuration, 1);
  let easedProgress = easeOutQuad(progress);

  level = Math.floor(easedProgress * maxLevel);

  levelDisplay.textContent = `Level: ${level}`;

  if (progress < 1) {
    requestAnimationFrame(updateLevel);
  }
}

requestAnimationFrame(updateLevel);
}
window.addEventListener('load', () => {
  const mode = localStorage.getItem('mode');
  const signature = document.getElementById('designerSignature');

  if (mode === 'online') {
    signature.style.display = 'block';
  } else {
    signature.style.display = 'none';
  }
});
