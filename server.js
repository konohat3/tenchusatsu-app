const express = require("express");
const { Solar } = require("lunar-javascript");

const app = express();
app.use(express.urlencoded({ extended: true }));

// 作成者リンク（ここを自分の表記にしたければ変更OK）
const AUTHOR_NAME = "tesokakonoha.com";
const AUTHOR_URL = "https://tesokakonoha.com/";

// 6タイプ → ブログURL（ﾈｺﾁｬﾝ確定版）
const TYPE_TO_URL = {
  "子丑": "https://tesokakonoha.com/tenchusatsu-neushi/",
  "寅卯": "https://tesokakonoha.com/tenchusatsu-torau/",
  "辰巳": "https://tesokakonoha.com/tenchusatsu-tatsumi/",
  "午未": "https://tesokakonoha.com/tenchusatsu-umahitsuji/",
  "申酉": "https://tesokakonoha.com/tenchusatsu-sarutori/",
  "戌亥": "https://tesokakonoha.com/tenchusatsu-inui/"
};

const GANS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHIS = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

function getDayGanzhiFromSolar(y, m, d) {
  const lunar = Solar.fromYmd(y, m, d).getLunar();

  if (typeof lunar.getDayInGanZhi === "function") {
    return lunar.getDayInGanZhi();
  }
  if (typeof lunar.getDayGan === "function" && typeof lunar.getDayZhi === "function") {
    return `${lunar.getDayGan()}${lunar.getDayZhi()}`;
  }

  const s = lunar.toFullString();
  for (const g of GANS) {
    for (const z of ZHIS) {
      const gz = g + z;
      if (s.includes(gz)) return gz;
    }
  }
  throw new Error("日干支の取得に失敗しました（ライブラリ仕様差分）");
}

function tenchusatsuTypeFromDayGanzhi(dayGanzhi) {
  const gan = dayGanzhi[0];
  const zhi = dayGanzhi[1];

  const ganIndex = GANS.indexOf(gan);
  const zhiIndex = ZHIS.indexOf(zhi);

  if (ganIndex < 0 || zhiIndex < 0) {
    throw new Error(`日干支の形式が想定外: ${dayGanzhi}`);
  }

  const xunStartZhiIndex = (zhiIndex - ganIndex + 12) % 12;
  const xunStartZhi = ZHIS[xunStartZhiIndex];

  const MAP = { "子":"戌亥","戌":"申酉","申":"午未","午":"辰巳","辰":"寅卯","寅":"子丑" };
  const type = MAP[xunStartZhi];
  if (!type) throw new Error(`旬頭地支が想定外: ${xunStartZhi}`);
  return type;
}

function footerHtml() {
  return `
    <div class="footer">
      <a href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">Created by ${AUTHOR_NAME}</a>
    </div>
  `;
}

function renderPage(html) {
  return `<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>天中殺チェック</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:24px;line-height:1.6}
  .card{max-width:720px;margin:0 auto;border:1px solid #ddd;border-radius:12px;padding:16px}

  .center { text-align: center; }

  h1{ text-align:center; margin: 0 0 12px; }

  form { margin-top: 10px; }
  label{display:block;margin-top:12px;text-align:center}
  input,button{
    font-size:16px;padding:10px;margin-top:6px;box-sizing:border-box;
    width:min(420px, 100%);
    display:block;
    margin-left:auto;margin-right:auto;
  }
  button{cursor:pointer}

  .muted{color:#666;font-size:13px;margin-top:10px}

  .result{
    margin:16px auto 0;
    padding:12px;
    background:#fff9db;
    border-radius:10px;
    width:min(560px, 100%);
    text-align:center;
  }

  a.btn{
    display:inline-block;
    margin-top:12px;
    text-align:center;
    padding:12px 14px;
    border-radius:10px;
    border:1px solid #222;
    text-decoration:none;
    color:#222;
    background:#fff;
  }

  .back { margin-top:16px; text-align:center; }

  /* 追加：作成者リンク（小さく控えめ） */
  .footer{
    margin-top:18px;
    padding-top:12px;
    border-top:1px solid #eee;
    text-align:center;
    font-size:12px;
    color:#777;
  }
  .footer a{
    color:#777;
    text-decoration:none;
  }
  .footer a:hover{
    text-decoration:underline;
  }
</style></head>
<body>
  <div class="card">
    ${html}
    ${footerHtml()}
  </div>
</body></html>`;
}

app.get("/", (req, res) => {
  res.send(renderPage(`
    <div class="center">
      <h1>天中殺チェック</h1>
      <form method="POST" action="/result">
        <label>生年月日
          <input type="date" name="birthdate" required />
        </label>
        <button type="submit">チェックする</button>
      </form>
      <div class="muted">※生年月日（時間なし）から日干支→旬空（空亡）を天中殺として判定します。</div>
    </div>
  `));
});

app.post("/result", (req, res) => {
  try {
    const birthdate = req.body.birthdate;
    if (!birthdate) throw new Error("生年月日が未入力です");

    const [yStr, mStr, dStr] = birthdate.split("-");
    const y = Number(yStr), m = Number(mStr), d = Number(dStr);

    const dayGanzhi = getDayGanzhiFromSolar(y, m, d);
    const type = tenchusatsuTypeFromDayGanzhi(dayGanzhi);
    const url = TYPE_TO_URL[type];

    res.send(renderPage(`
      <div class="center">
        <h1>結果</h1>

        <div class="result">
          <div><strong>あなたの天中殺：</strong>${type}天中殺</div>
          <div><strong>日干支：</strong>${dayGanzhi}</div>
        </div>

        <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">解説ページへ</a>

        <div class="back"><a href="/">← もう一度</a></div>
      </div>
    `));
  } catch (e) {
    res.status(400).send(renderPage(`
      <div class="center">
        <h1>エラー</h1>
        <p>${String(e.message || e)}</p>
        <div class="back"><a href="/">← 戻る</a></div>
      </div>
    `));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
