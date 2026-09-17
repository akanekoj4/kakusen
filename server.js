require("dotenv").config();

const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));


// =====================================
// 使用するAIモデル
// 上から順番に試す
// =====================================

const MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free"
];


// =====================================
// OpenRouter 共通処理
// =====================================

async function askOpenRouter(messages) {

  for (const model of MODELS) {

    console.log(`AIモデルを試します: ${model}`);

    try {

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            model: model,
            messages: messages
          })
        }
      );

      const data = await response.json();

      if (response.ok) {

        const result =
          data.choices?.[0]?.message?.content;

        if (result) {

          console.log(`成功したモデル: ${model}`);

          return {
            result: result,
            model: model
          };

        }
      }

      console.log(`モデル失敗: ${model}`);
      console.log(JSON.stringify(data, null, 2));

    } catch (error) {

      console.log(`通信失敗: ${model}`);
      console.error(error);

    }
  }

  throw new Error(
    "すべてのAIモデルで処理に失敗しました"
  );
}


// =====================================
// JSONを安全に取り出す
// =====================================

function parseAIJson(text) {

  try {

    // ```json ～ ``` が付いた場合に削除
    let cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 前後に説明文が付いた場合でも
    // 最初の { から最後の } まで取り出す
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      cleaned = cleaned.slice(start, end + 1);
    }

    return JSON.parse(cleaned);

  } catch (error) {

    console.error("JSON解析失敗");
    console.error("AIの元回答:", text);

    return null;

  }
}


// =====================================
// 絵のAI判定
// =====================================

app.post("/judge", async (req, res) => {

  try {

    const imageData = req.body.image;

    if (!imageData) {

      return res.status(400).json({
        error: "画像データがありません"
      });

    }


    const messages = [

      {
        role: "user",

        content: [

          {
            type: "text",

            text: `
この画像は、お絵描き対戦ゲーム
「描戦 -KAKUSEN-」で
プレイヤーが描いた絵です。

プレイヤー本人が何を描いたつもりかは分かりません。

画像の見た目だけから、
何が描かれているか判断してください。

その絵を
「戦えるキャラクター」
として解釈してください。


必ず以下のJSON形式だけで回答してください。

{
  "name": "キャラクター名",
  "attribute": "属性",
  "attack": "攻撃方法",
  "special": "特殊能力",
  "weakness": "弱点"
}


【重要なルール】

・JSON以外の文章を書かない

・Markdownを使わない

・各項目は短くする

・nameには画像が何に見えたのかを反映する

・attributeは
「火」「水」「植物」「機械」
「動物」「物理」「風」「氷」
など簡潔にする

・attackは1つだけ

・specialも1つだけ

・weaknessは必ず設定する

・普通は戦わない物でも、
その見た目や性質から
ゲームらしい能力を考える

・強すぎる能力にはしない

・絵が下手だったり曖昧でも
「不明」にはせず、
最も近く見えるものを判断する


例：

{
  "name": "リンゴモンスター",
  "attribute": "植物",
  "attack": "転がって体当たり",
  "special": "種を弾丸のように飛ばす",
  "weakness": "火と高温"
}
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

    ];


    const ai =
      await askOpenRouter(messages);


    console.log("AIの元回答:");
    console.log(ai.result);


    const character =
      parseAIJson(ai.result);


    // JSONとして読めなかった場合
    if (!character) {

      return res.status(500).json({
        error:
          "AIの判定形式が崩れました。もう一度AI判定してください。"
      });

    }


    // 必要な項目が存在するか確認
    if (
      !character.name ||
      !character.attribute ||
      !character.attack ||
      !character.special ||
      !character.weakness
    ) {

      console.error(
        "必要な項目が不足しています:",
        character
      );

      return res.status(500).json({
        error:
          "AIの判定データが不足しています。もう一度AI判定してください。"
      });

    }


    // =================================
    // 画面表示用
    // =================================

    const displayResult =
`判定：${character.name}
属性：${character.attribute}
攻撃：${character.attack}
特殊能力：${character.special}
弱点：${character.weakness}`;


    res.json({

      // 画面に表示する文章
      result: displayResult,

      // バトルなどで将来的に使えるデータ
      character: character,

      // デバッグ用
      model: ai.model

    });


  } catch (error) {

    console.error(
      "judge error:",
      error
    );


    res.status(500).json({

      error:
        "現在AIが混雑しています。少し待ってからもう一度試してください。"

    });

  }

});


// =====================================
// バトル判定
// =====================================

app.post("/battle", async (req, res) => {

  try {

    const {
      playerA,
      playerB,
      field
    } = req.body;


    if (!playerA || !playerB) {

      return res.status(400).json({
        error:
          "PLAYER AまたはPLAYER Bの情報がありません"
      });

    }


    const messages = [

      {

        role: "user",

        content: `
あなたは
「描戦 -KAKUSEN-」
というお絵描き対戦ゲームの
バトル審判です。


【フィールド】
${field || "指定なし"}


【PLAYER A】
${playerA}


【PLAYER B】
${playerB}


2体の

・判定
・属性
・攻撃
・特殊能力
・弱点

と、

・フィールドとの相性

を考えて勝敗を決めてください。


【勝敗ルール】

・単純に強そうな方を勝たせない

・攻撃、特殊能力、弱点、
フィールドの相性を重視する

・弱そうなキャラクターでも
相性次第で勝てる

・フィールドを戦闘に活用する

・無理やりな勝敗にはしない

・読んだ人が
「なるほど！」
と思える結果にする


必ず以下のJSON形式だけで回答してください。


{
  "winner": "PLAYER A",
  "winnerName": "キャラクター名",
  "reason": "勝因",
  "battle": [
    "1つ目の展開",
    "2つ目の展開",
    "3つ目の展開",
    "4つ目の展開"
  ],
  "surprise": "意外だったポイント"
}


【出力ルール】

・JSON以外の文章を書かない

・Markdownを使わない

・winnerは必ず
「PLAYER A」か「PLAYER B」

・winnerNameには
勝ったキャラクターの名前を書く

・reasonは40文字以内を目安にする

・battleは必ず4ステップ

・battleの各ステップは
35文字以内を目安にする

・surpriseは50文字以内を目安にする

・戦闘はテンポよくする

・攻撃や特殊能力を
実際に戦闘で使わせる

・フィールドもできるだけ活用する

・PLAYER AとPLAYER Bの
設定に存在しない能力を
勝手に追加しない


出力例：

{
  "winner": "PLAYER A",
  "winnerName": "リンゴモンスター",
  "reason": "砂漠の強風が相手の弱点を突いた",
  "battle": [
    "花モンスターが花粉攻撃を放つ",
    "砂漠の強風で花粉が吹き飛ぶ",
    "リンゴモンスターが転がって接近",
    "強烈な体当たりで勝負を決める"
  ],
  "surprise": "強力な花粉攻撃が砂漠では逆に弱点になった"
}
`

      }

    ];


    const ai =
      await askOpenRouter(messages);


    console.log("バトルAIの元回答:");
    console.log(ai.result);


    const battle =
      parseAIJson(ai.result);


    if (!battle) {

      return res.status(500).json({
        error:
          "バトル結果の形式が崩れました。もう一度試してください。"
      });

    }


    if (
      !battle.winner ||
      !battle.winnerName ||
      !battle.reason ||
      !Array.isArray(battle.battle) ||
      !battle.surprise
    ) {

      console.error(
        "バトルデータ不足:",
        battle
      );

      return res.status(500).json({
        error:
          "バトル結果のデータが不足しています。"
      });

    }


    const steps =
      battle.battle
        .slice(0, 4)
        .map((step, index) =>
          `${index + 1}. ${step}`
        )
        .join("\n↓\n");


    const displayResult =
`🏆 WINNER：${battle.winner}
${battle.winnerName}

【勝因】
${battle.reason}

【BATTLE】
${steps}

【意外なポイント】
${battle.surprise}`;


    res.json({

      result: displayResult,

      battle: battle,

      model: ai.model

    });


  } catch (error) {

    console.error(
      "battle error:",
      error
    );


    res.status(500).json({

      error:
        "現在AIが混雑しています。少し待ってからもう一度試してください。"

    });

  }

});


// =====================================
// サーバー起動
// =====================================

app.listen(PORT, () => {

  console.log(
    `描戦サーバー起動: http://localhost:${PORT}`
  );

});