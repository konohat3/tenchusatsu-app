const express = require("express");
const { Solar } = require("lunar-javascript");

const app = express();
app.use(express.urlencoded({ extended: true }));

// 作成者リンク
const AUTHOR_NAME = "tesokakonoha.com";
const AUTHOR_URL = "https://tesokakonoha.com/";

// 年の入力範囲（UI）
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

  // 存在する日付かチェック（UTCで確実に）
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
  if (ganIndex < 0 || zhiIndex < 0) throw new Error(`日干支の形式が想定外: ${dayGanzhi}`);

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
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:24px;line-height:1.6}
  .card{
    max-width:720px;
    margin:0 auto;
    border:1px solid #ddd;
    border-radius:12px;
    padding:16px;
    overflow:hidden;
  }
  .center{ text-align:center; }
  h1{ text-align:center; margin: 0 0 12px; }

  form{ margin-top:10px; }
  label{display:block;margin-top:12px;text-align:center}

  /* 入力列（年手入力＋月日select） */
  .dob{
    width:min(560px, 100%);
    margin: 6px auto 0;
    display:grid;
    grid-template-columns: 1.3fr 1fr 1fr;
    gap:10px;
    justify-content:center;
    align-items:end;
  }

  .field{ text-align:left; }
  .field .cap{ font-size:13px; color:#555; text-align:center; margin-bottom:4px; }

  input, select, button{
    font-size:16px;
    padding:10px;
    max-width:100%;
    width:100%;
  }

  /* 年入力：数字キーボード誘導 */
  input[type="number"]{ appearance:textfield; }
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button{ -webkit-appearance: none; margin: 0; }

  button{
    cursor:pointer;
    width:min(420px, 100%);
    display:block;
    margin:12px auto 0;
  }

  .muted{color:#666;font-size:13px;margin-top:10px}

  .result{
    margin:16px auto 0;
    padding:12px;
    background:#fff9db;
    border-radius:10px;
    width:min(560px, 100%);
    max-width:100%;
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

  .back{ margin-top:16px; text-align:center; }

  .footer{
    margin-top:18px;
    padding-top:12px;
    border-top:1px solid #eee;
    text-align:center;
    font-size:12px;
    color:#777;
  }
  .footer a{ color:#777; text-decoration:none; }
  .footer a:hover{ text-decoration:underline; }

  /* スマホでは縦積み */
  @media (max-width: 520px){
    .dob{
      grid-template-columns: 1fr;
      gap:8px;
    }
  }
</style>
</head>
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

      <form method="POST" action="/result" id="form" novalidate>
        <label>生年月日</label>

        <div class="dob" aria-label="生年月日">
          <div class="field">
            <div class="cap">年（西暦）</div>
            <input
              type="number"
              name="y"
              id="y"
              inputmode="numeric"
              min="${YEAR_MIN}"
              max="${YEAR_MAX}"
              placeholder="西暦（例：1982）"
              required
            />
          </div>

          <div class="field">
            <div class="cap">月</div>
            <select name="m" id="m" required aria-label="月">
              <option value="">選択</option>
              ${Array.from({length:12}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}
            </select>
          </div>

          <div class="field">
            <div class="cap">日</div>
            <select name="d" id="d" required aria-label="日">
              <option value="">選択</option>
            </select>
          </div>
        </div>

        <button type="submit">チェックする</button>
      </form>

      <div class="muted">※生年月日（時間なし）から日干支→旬空（空亡）を天中殺として判定します。</div>
    </div>

<script>
(function(){
  const YEAR_MIN = ${YEAR_MIN};
  const YEAR_MAX = ${YEAR_MAX};

  const y = document.getElementById('y');
  const m = document.getElementById('m');
  const d = document.getElementById('d');
  const form = document.getElementById('form');

  function daysInMonth(year, month){
    if (!year || !month) return 31;
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function rebuildDays(){
    const year = parseInt(y.value, 10);
    const month = parseInt(m.value, 10);

    const current = d.value;
    d.innerHTML = '<option value="">選択</option>';

    if (!Number.isFinite(year) || !Number.isFinite(month)) return;

    const max = daysInMonth(year, month);
    const frag = document.createDocumentFragment();
    for (let day=1; day<=max; day++){
      const opt = document.createElement('option');
      opt.value = String(day);
      opt.textContent = String(day);
      frag.appendChild(opt);
    }
    d.appendChild(frag);

    if (current && parseInt(current,10) <= max) d.value = current;
  }

  y.addEventListener('input', rebuildDays);
  m.addEventListener('change', rebuildDays);

  // 表示：入力が確定したら「西暦◯◯年」っぽく見せる（値は数字のまま）
  y.addEventListener('blur', () => {
    const year = parseInt(y.value, 10);
    if (Number.isFinite(year)) {
      // 見た目の補助（placeholderを変更）
      y.placeholder = '西暦（例：1982）';
    }
  });

  // 送信前チェック（ブラウザ標準より分かりやすく）
  form.addEventListener('submit', (e) => {
    const year = parseInt(y.value, 10);
    const month = parseInt(m.value, 10);
    const day = parseInt(d.value, 10);

    if (!Number.isFinite(year) || year < YEAR_MIN || year > YEAR_MAX) {
      e.preventDefault();
      alert('年は ' + YEAR_MIN + '〜' + YEAR_MAX + ' の範囲で入力してください（例：1982）');
      y.focus();
      return;
    }
    if (!Number.isFinite(month)) {
      e.preventDefault();
      alert('月を選択してください');
      m.focus();
      return;
    }
    if (!Number.isFinite(day)) {
      e.preventDefault();
      alert('日を選択してください');
      d.focus();
      return;
    }
  });
})();
</script>
  `));
});

app.post("/result", (req, res) => {
  try {
    const y = Number(req.body.y);
    const m = Number(req.body.m);
    const d = Number(req.body.d);

    if (!isValidYmd(y, m, d)) {
      throw new Error(`無効な日付です（${YEAR_MIN}〜${YEAR_MAX}年の正しい日付を入力してください）`);
    }

    let dayGanzhi;
    try {
      dayGanzhi = getDayGanzhiFromSolar(y, m, d);
    } catch (libErr) {
      throw new Error("この日付は暦計算ライブラリの対応外の可能性があります。別の日付でお試しください。");
    }

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
app.listen(PORT, () => console.log("Listening on " + PORT));
