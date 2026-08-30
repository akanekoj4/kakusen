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

const judgeButton = document.getElementById("judgeButton");
const result = document.getElementById("result");

judgeButton.addEventListener("click", async () => {
  try {
    result.textContent = "判定中...";

    // AI送信用の一時キャンバスを作る
const sendCanvas = document.createElement("canvas");
sendCanvas.width = canvas.width;
sendCanvas.height = canvas.height;

const sendCtx = sendCanvas.getContext("2d");

// 背景を白くする
sendCtx.fillStyle = "white";
sendCtx.fillRect(0, 0, sendCanvas.width, sendCanvas.height);

// プレイヤーが描いた絵を上から重ねる
sendCtx.drawImage(canvas, 0, 0);

// 白背景付きPNGにする
const imageData = sendCanvas.toDataURL("image/png");

    const response = await fetch("/judge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: imageData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      result.textContent = data.error || "判定に失敗しました";
      return;
    }

    result.textContent = data.result;

  } catch (error) {
    console.error(error);
    result.textContent = "通信エラーが発生しました";
  }
});