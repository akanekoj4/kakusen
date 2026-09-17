
// ===============================
// フィールドをランダムに決定
// ===============================

const fields = [
  "砂漠",
  "海",
  "雪原",
  "森",
  "火山",
  "宇宙"
];

const selectedField =
  fields[Math.floor(Math.random() * fields.length)];

const fieldName =
  document.getElementById("fieldName");

fieldName.textContent = selectedField;
let playerAData = null;
let playerBData = null;

function setupDrawing(
  canvasId,
  clearButtonId,
  judgeButtonId,
  resultId,
  playerName
) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  const clearButton = document.getElementById(clearButtonId);
  const judgeButton = document.getElementById(judgeButtonId);
  const result = document.getElementById(resultId);

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
    result.textContent = "判定結果：---";

    if (playerName === "A") {
      playerAData = null;
    }

    if (playerName === "B") {
      playerBData = null;
    }
  });

  judgeButton.addEventListener("click", async () => {
    try {
      result.textContent = "判定中...";

      // AI送信用キャンバス
      const sendCanvas = document.createElement("canvas");
      sendCanvas.width = canvas.width;
      sendCanvas.height = canvas.height;

      const sendCtx = sendCanvas.getContext("2d");

      // 背景を白にする
      sendCtx.fillStyle = "white";
      sendCtx.fillRect(
        0,
        0,
        sendCanvas.width,
        sendCanvas.height
      );

      // 描いた絵を重ねる
      sendCtx.drawImage(canvas, 0, 0);

      // PNG画像に変換
      const imageData =
        sendCanvas.toDataURL("image/png");

      // AI判定
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
        result.textContent =
          data.error || "判定に失敗しました";
        return;
      }

      result.textContent = data.result;

      // AI判定結果を保存
      if (playerName === "A") {
        playerAData = data.result;
      }

      if (playerName === "B") {
        playerBData = data.result;
      }

    } catch (error) {
      console.error(error);
      result.textContent =
        "通信エラーが発生しました";
    }
  });

  return canvas;
}


// PLAYER A
const canvasA = setupDrawing(
  "canvasA",
  "clearA",
  "judgeA",
  "resultA",
  "A"
);


// PLAYER B
const canvasB = setupDrawing(
  "canvasB",
  "clearB",
  "judgeB",
  "resultB",
  "B"
);


// -------------------------
// バトル処理
// -------------------------

const battleButton =
  document.getElementById("battleButton");

const battleResult =
  document.getElementById("battleResult");


battleButton.addEventListener(
  "click",
  async () => {

    // 両方AI判定しているか確認
    if (!playerAData || !playerBData) {
      battleResult.textContent =
        "先にPLAYER AとPLAYER BをAI判定してください";
      return;
    }

    battleResult.textContent =
      "バトル判定中...";

    try {

      const response = await fetch("/battle", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          playerA: playerAData,
          playerB: playerBData,
          field: "selectedField"
        })
      });


      const data = await response.json();


      if (!response.ok) {
        battleResult.textContent =
          data.error ||
          "バトル判定に失敗しました";
        return;
      }


      battleResult.textContent =
        data.result;

    } catch (error) {

      console.error(error);

      battleResult.textContent =
        "通信エラーが発生しました";

    }
  }
);