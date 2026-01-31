const board = document.getElementById("board");
const statusText = document.getElementById("status");

let currentPlayer = "red";
let pieces = { red: 24, blue: 24 };
let placementPhase = true;
let placementsThisTurn = 0;
let selectedPiece = null;

const holes = [];

// إنشاء اللوحة
for (let i = 0; i < 49; i++) {
  const hole = document.createElement("div");
  hole.classList.add("hole");
  hole.dataset.index = i;

  if (i === 24) hole.classList.add("center");

  hole.addEventListener("click", () => handleClick(hole));
  board.appendChild(hole);
  holes.push(hole);
}

function handleClick(hole) {
  if (placementPhase) placePhase(hole);
  else movePhase(hole);
}

function placePhase(hole) {
  if (hole.dataset.index == 24) return;
  if (hole.querySelector(".piece")) return;

  addPiece(hole, currentPlayer);
  pieces[currentPlayer]--;
  placementsThisTurn++;

  if (placementsThisTurn === 2) switchTurn();

  if (pieces.red === 0 && pieces.blue === 0) {
    placementPhase = false;
    statusText.textContent = "مرحلة اللعب بدأت! أدخل حجر إلى الوسط.";
  }
}

function movePhase(hole) {
  if (!selectedPiece) {
    if (hole.firstChild && hole.firstChild.classList.contains(currentPlayer)) {
      selectedPiece = hole;
      hole.classList.add("selected");
    }
    return;
  }

  const from = parseInt(selectedPiece.dataset.index);
  const to = parseInt(hole.dataset.index);

  if (!isValidMove(from, to)) {
    selectedPiece.classList.remove("selected");
    selectedPiece = null;
    return;
  }

  hole.appendChild(selectedPiece.firstChild);
  selectedPiece.classList.remove("selected");
  selectedPiece = null;

  checkCapture(to);
  switchTurn();
}

function isValidMove(from, to) {
  if (holes[to].firstChild) return false;
  const diff = Math.abs(from - to);
  return diff === 1 || diff === 7;
}

function checkCapture(pos) {
  const directions = [1, -1, 7, -7];

  directions.forEach(d => {
    const mid = pos + d;
    const end = pos + d * 2;
    if (!holes[mid] || !holes[end]) return;

    const midPiece = holes[mid].firstChild;
    const endPiece = holes[end].firstChild;

    if (
      midPiece &&
      endPiece &&
      !midPiece.classList.contains(currentPlayer) &&
      endPiece.classList.contains(currentPlayer)
    ) {
      midPiece.remove();
    }
  });
}

function addPiece(hole, color) {
  const p = document.createElement("div");
  p.classList.add("piece", color);
  hole.appendChild(p);
}

function switchTurn() {
  placementsThisTurn = 0;
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  statusText.textContent =
    currentPlayer === "red" ? "دور الأحمر" : "دور الأزرق";
}
<script>
  function showTempImage() {
    const img = document.getElementById('tempImage');
    img.style.display = 'block';

    setTimeout(() => {
      img.style.display = 'none';
    }, 5000); // 5000 مللي ثانية = 5 ثواني
  }

  // استدعاء الدالة عند تحميل الصفحة (عند الدخول على الصفحة)
  window.addEventListener('load', () => {
    showTempImage();
  });
</script>