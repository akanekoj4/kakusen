require("dotenv").config();

const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));

app.post("/judge", async (req, res) => {
  try {
    const imageData = req.body.image;

    if (!imageData) {
      return res.status(400).json({
        error: "画像データがありません"
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
この画像は、お絵描き対戦ゲームでプレイヤーが描いた絵です。

プレイヤー本人が何を描いたつもりかは分かりません。
画像の見た目だけから判断してください。

この絵を「戦えるキャラクター」だと考えて、
次の形式で日本語で短く答えてください。

判定：
属性：
特徴：
攻撃方法：
特殊能力：
弱点：
戦い方：

重要：
・絵が下手だったり曖昧でも、あなたが実際に何に見えたかを答えてください。
・普通は戦わない物でも、見た目や性質から面白い戦い方を考えてください。
・強すぎる能力にはせず、必ず弱点も作ってください。
`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({
        error: "AIの判定に失敗しました"
      });
    }

    const result = data.choices?.[0]?.message?.content;

    res.json({
      result: result || "判定結果を取得できませんでした"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "サーバーでエラーが発生しました"
    });
  }
});
app.post("/battle", async (req, res) => {
  try {
    const { playerA, playerB, field } = req.body;

    if (!playerA || !playerB) {
      return res.status(400).json({
        error: "PLAYER AまたはPLAYER Bの情報がありません"
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: `
あなたは「描戦 -KAKUSEN-」という
お絵描き対戦ゲームのバトル審判です。

以下の2体が戦います。

【フィールド】
${field || "指定なし"}

【PLAYER A】
${playerA}

【PLAYER B】
${playerB}

2体それぞれの
・属性
・特徴
・攻撃方法
・特殊能力
・弱点
・戦い方

と、

フィールドとの相性を考えて、
勝敗を決めてください。

単純に「強そうな方」を勝たせるのではなく、
相性や能力の使い方によって
意外な結果が起きても構いません。

ただし、
無理やりすぎる結果にはせず、
読んだ人が
「なるほど、そうなるのか！」
と思える展開にしてください。

次の形式で日本語で短く答えてください。

勝者：
勝因：
戦闘展開：
意外だったポイント：

戦闘展開は3〜5ステップ程度で、
実際に2体がどう動いたか分かるようにしてください。
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("battle error:", data);

      return res.status(500).json({
        error: "バトル判定に失敗しました"
      });
    }

    const result =
      data.choices?.[0]?.message?.content;

    res.json({
      result:
        result ||
        "バトル結果を取得できませんでした"
    });

  } catch (error) {
    console.error("battle server error:", error);

    res.status(500).json({
      error: "バトル処理でエラーが発生しました"
    });
  }
});
app.listen(PORT, () => {
  console.log(`描戦サーバー起動: http://localhost:${PORT}`);
});