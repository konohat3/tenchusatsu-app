const express = require("express");
const { Solar } = require("lunar-javascript");

const app = express();
app.use(express.urlencoded({ extended: true }));

// 作成者リンク
const AUTHOR_NAME = "tesokakonoha.com";
const AUTHOR_URL = "https://tesokakonoha.com/";

// 年の入力範囲（UI/サーバ共通）
const YEAR_MIN = 900;
const YEAR_MAX = 3000;

// 6タイプ → ブログURL
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

function isValidYmd(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < YEAR_MIN || y > YEAR_MAX) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // 存在する日付か（2/30などを弾く）
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === (m - 1) &&
    dt.getUTCDate() === d
  );
}

function getDayGanzhiFromSolar(y, m, d) {
  const lunar = Solar.fromYmd(y, m, d).getLunar();

  if (typeof lunar.getDayInGanZhi === "function") {
    return lunar.getDayInGanZhi();
  }
  if (typeof lunar.getDayGan === "function" && typeof lunar.getDayZhi === "function") {
    return "" + lunar.getDayGan() + lunar.getDayZhi();
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
  if (ganIndex < 0 || zhiIndex < 0) throw new Error("日干支の形式が想定外です: " + dayGanzhi);

  // 旬頭の地支 = (地支index - 干index) mod 12
  const xunStartZhiIndex = (zhiIndex - ganIndex + 12) % 12;
  const xunStartZhi = ZHIS[xunStartZhiIndex];

  // 旬頭地支 → 空亡（二支） = 天中殺6タイプ
  const MAP = { "子":"戌亥","戌":"申酉","申":"午未","午":"辰巳","辰":"寅卯","寅":"子丑" };
  const type = MAP[xunStartZhi];
  if (!type) throw new Error("旬頭地支が想定外です: " + xunStartZhi);
  return type;
}

function footerHtml() {
  return (
    '<div class="footer">' +
      '<a href="' + AUTHOR_URL + '" target="_blank" rel="noopener noreferrer">' +
        "Created by " + AUTHOR_NAME +
      "</a>" +
    "</div>"
  );
}

function renderPage(innerHtml) {
  return (
'<!doctype html>' +
'<html lang="ja"><head>' +
'<meta charset="utf-8" />' +
'<meta name="viewport" content="width=device-width, initial-scale=1" />' +
"<title>天中殺チェック</title>" +
"<style>" +
"  *{box-sizing:border-box}" +
"  body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:24px;line-height:1.6}" +
"  .card{max-width:720px;margin:0 auto;border:1px solid #ddd;border-radius:12px;padding:16px;overflow:hidden}" +
"  .center{text-align:center}" +
"  h1{margin:0 0 12px;text-align:center}" +

"  form{margin-top:10px}" +
"  label{display:block;margin-top:12px;text-align:center}" +

"  .row{width:min(560px,100%);margin:10px auto 0;display:flex;gap:10px;justify-content:center;align-items:flex-end;flex-wrap:wrap}" +
"  .field{flex:1 1 140px;min-width:140px;text-align:center}" +
"  .cap{font-size:13px;color:#555;margin-bottom:4px}" +

"  input,button{font-size:16px;padding:10px;width:100%;max-width:100%}" +
"  button{cursor:pointer;width:min(420px,100%);display:block;margin:14px auto 0}" +

"  .muted{color:#666;font-size:13px;margin-top:10px}" +

"  .result{margin:16px auto 0;padding:12px;background:#fff9db;border-radius:10px;width:min(560px,100%);max-width:100%;text-align:center}" +
"  a.btn{display:inline-block;margin-top:12px;padding:12px 14px;border-radius:10px;border:1px solid #222;text-decoration:none;color:#222;background:#fff}" +
"  .back{margin-top:16px;text-align:center}" +

"  .footer{margin-top:18px;padding-top:12px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#777}" +
"  .footer a{color:#777;text-decoration:none}" +
"  .footer a:hover{text-decoration:underline}" +
"</style>" +
"</head><body>" +
'  <div class="card">' +
     innerHtml +
     footerHtml() +
"  </div>" +
"</body></html>"
  );
}

app.get("/", (req, res) => {
  const html =
    '<div class="center">' +
      "<h1>天中殺チェック</h1>" +
      '<form method="POST" action="/result" id="form" novalidate>' +
        "<label>生年月日</label>" +

        '<div class="row" aria-label="生年月日">' +
          '<div class="field">' +
            '<div class="cap">年（西暦）</div>' +
            '<input type="number" name="y" id="y" inputmode="numeric" min="' + YEAR_MIN + '" max="' + YEAR_MAX + '" placeholder="例：2026" required />' +
          "</div>" +

          '<div class="field">' +
            '<div class="cap">月</div>' +
            '<input type="number" name="m" id="m" inputmode="numeric" min="1" max="12" placeholder="例：1" required />' +
          "</div>" +

          '<div class="field">' +
            '<div class="cap">日</div>' +
            '<input type="number" name="d" id="d" inputmode="numeric" min="1" max="31" placeholder="例：7" required />' +
          "</div>" +
        "</div>" +

        '<button type="submit">チェックする</button>' +
      "</form>" +

      '<div class="muted">※生年月日（時間なし）から日干支→旬空（空亡）を天中殺として判定します。</div>' +
    "</div>" +

    "<script>" +
    "(function(){" +
      "var YEAR_MIN=" + YEAR_MIN + ";" +
      "var YEAR_MAX=" + YEAR_MAX + ";" +
      "var form=document.getElementById('form');" +
      "var y=document.getElementById('y');" +
      "var m=document.getElementById('m');" +
      "var d=document.getElementById('d');" +

      "function isInt(v){return Number.isFinite(v) && Math.floor(v)===v;}" +
      "function validDate(Y,M,D){" +
        "if(!isInt(Y)||!isInt(M)||!isInt(D)) return false;" +
        "if(Y<YEAR_MIN||Y>YEAR_MAX) return false;" +
        "if(M<1||M>12) return false;" +
        "if(D<1||D>31) return false;" +
        "var dt=new Date(Date.UTC(Y,M-1,D));" +
        "return dt.getUTCFullYear()===Y && dt.getUTCMonth()===(M-1) && dt.getUTCDate()===D;" +
      "}" +

      "form.addEventListener('submit',function(e){" +
        "var Y=parseInt(y.value,10);" +
        "var M=parseInt(m.value,10);" +
        "var D=parseInt(d.value,10);" +
        "if(!validDate(Y,M,D){" +
          "e.preventDefault();" +
          "alert('日付が正しくありません。年は'+YEAR_MIN+'〜'+YEAR_MAX+'、月は1〜12、日付は存在する日を入力してください。');" +
          "return;" +
        "}" +
      "});" +
    "})();" +
    "</script>";

  res.send(renderPage(html));
});

app.post("/result", (req, res) => {
  try {
    const y = Number(req.body.y);
    const m = Number(req.body.m);
    const d = Number(req.body.d);

    if (!isValidYmd(y, m, d)) {
      throw new Error("無効な日付です（年は" + YEAR_MIN + "〜" + YEAR_MAX + "、月は1〜12、日付は存在する日を入力してください）");
    }

    let dayGanzhi;
    try {
      dayGanzhi = getDayGanzhiFromSolar(y, m, d);
    } catch (libErr) {
      throw new Error("この日付は暦計算ライブラリの対応外の可能性があります。別の日付でお試しください。");
    }

    const type = tenchusatsuTypeFromDayGanzhi(dayGanzhi);
    const url = TYPE_TO_URL[type];

    const html =
      '<div class="center">' +
        "<h1>結果</h1>" +
        '<div class="result">' +
          "<div><strong>あなたの天中殺：</strong>" + type + "天中殺</div>" +
          "<div><strong>日干支：</strong>" + dayGanzhi + "</div>" +
        "</div>" +
        '<a class="btn" href="' + url + '" target="_blank" rel="noopener noreferrer">解説ページへ</a>' +
        '<div class="back"><a href="/">← もう一度</a></div>' +
      "</div>";

    res.send(renderPage(html));
  } catch (e) {
    const html =
      '<div class="center">' +
        "<h1>エラー</h1>" +
        "<p>" + String(e.message || e) + "</p>" +
        '<div class="back"><a href="/">← 戻る</a></div>' +
      "</div>";
    res.status(400).send(renderPage(html));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Listening on " + PORT));
