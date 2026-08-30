const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

const clearButton = document.getElementById("clearButton");

let drawing = false;

canvas.addEventListener("pointerdown", (event) => {
  drawing = true;

  ctx.beginPath();
  ctx.moveTo(event.offsetX, event.offsetY);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing) return;

  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";

  ctx.lineTo(event.offsetX, event.offsetY);
  ctx.stroke();
});

canvas.addEventListener("pointerup", () => {
  drawing = false;
});

canvas.addEventListener("pointerleave", () => {
  drawing = false;
});

clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});