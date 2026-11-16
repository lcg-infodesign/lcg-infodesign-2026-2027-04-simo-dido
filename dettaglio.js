let myTable, numRivers;
let riverRow = -1;                 // riga del CSV corrispondente al fiume cliccato

// Le 4 metriche numeriche confrontate con il dataset
let metrics = ["length", "area", "discharge", "tributaries"];
let metricLabels = ["Lunghezza", "Bacino idrografico", "Portata d'acqua", "Numero di affluenti"];
let metricUnits = [" km", " km²", " m³/s", ""];
let metricMax = [0, 0, 0, 0];      // massimo del dataset
let metricMin = [0, 0, 0, 0];      // minimo del dataset
let metricAvg = [0, 0, 0, 0];      // media del dataset
let metricRank = [0, 0, 0, 0];     // posizione in classifica del fiume (1 = il più grande)

// Valori per colore e diametro
let minDischarge, maxDischarge, minTemp, maxTemp;
// Estremi di temperatura del dataset (per la riga "temperatura") e media
let tempLow, tempHigh, avgTempDataset;

// Layout (ricalcolato in draw() così funziona anche dopo windowResized)
let colW, rx0, rx1, rowsTop, rowsBottom, rowH;

// Bottone "torna indietro"
let backBtn = { x: 55, y: 82, w: 70, h: 62 };

// Colori di accento
let CYAN = [0, 229, 255];          // #00E5FF
let SLATE_LIGHT = [203, 213, 225];
let SLATE = [148, 163, 184];

async function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);

  myTable = await loadTable("assets/rivers.csv", ",", "header");
  numRivers = myTable.getRowCount();

  // Lettura del parametro passato dalla pagina principale
  const params = getURLParams();
  let idParam = decodeURIComponent(params["id"] || "1"); // se manca, mostra il fiume con id 1

  prepareData();
  riverRow = findRiver(idParam);
  if (riverRow !== -1) {
    computeRanks();
  }
}

// Calcolo di minimi, massimi e medie di tutto il dataset
function prepareData() {
  minDischarge = myTable.getNum(0, "discharge");
  maxDischarge = minDischarge;
  minTemp = myTable.getNum(0, "avg_temp");
  maxTemp = minTemp;
  tempLow = myTable.getNum(0, "min_temp");
  tempHigh = myTable.getNum(0, "max_temp");

  for (let m = 0; m < metrics.length; m++) {
    metricMin[m] = myTable.getNum(0, metrics[m]);
    metricMax[m] = metricMin[m];
  }

  let sumTemp = 0;
  let sums = [0, 0, 0, 0];

  for (let i = 0; i < numRivers; i++) {
    for (let m = 0; m < metrics.length; m++) {
      let val = myTable.getNum(i, metrics[m]);
      if (val > metricMax[m]) metricMax[m] = val;
      if (val < metricMin[m]) metricMin[m] = val;
      sums[m] += val;
    }
    let d = myTable.getNum(i, "discharge");
    if (d < minDischarge) minDischarge = d;
    if (d > maxDischarge) maxDischarge = d;

    let t = myTable.getNum(i, "avg_temp");
    if (t < minTemp) minTemp = t;
    if (t > maxTemp) maxTemp = t;
    sumTemp += t;

    let tl = myTable.getNum(i, "min_temp");
    let th = myTable.getNum(i, "max_temp");
    if (tl < tempLow) tempLow = tl;
    if (th > tempHigh) tempHigh = th;
  }

  for (let m = 0; m < metrics.length; m++) {
    metricAvg[m] = sums[m] / numRivers;
  }
  avgTempDataset = sumTemp / numRivers;
}

// Cerca la riga del fiume con l'id ricevuto dall'URL (-1 se non esiste)
function findRiver(idParam) {
  for (let i = 0; i < numRivers; i++) {
    if (myTable.getString(i, "id") === idParam) return i;
  }
  return -1;
}

// Posizione in classifica: 1 + numero di fiumi con valore più alto
function computeRanks() {
  for (let m = 0; m < metrics.length; m++) {
    let mine = myTable.getNum(riverRow, metrics[m]);
    let rank = 1;
    for (let i = 0; i < numRivers; i++) {
      if (myTable.getNum(i, metrics[m]) > mine) rank++;
    }
    metricRank[m] = rank;
  }
}

// Normalizza il valore: lineare per lunghezza, radice quadrata per le altre
function scaleValue(val, m) {
  return (m === 0) ? (val / metricMax[0]) : (sqrt(val) / sqrt(metricMax[m]));
}

// Diametro dei cerchi nelle strisce
function diameterFromDischarge(discharge) {
  return map(sqrt(discharge), sqrt(minDischarge), sqrt(maxDischarge), 8, 46);
}

// Colore in base alla temperatura
function getRiverColor(temp, alpha) {
  let t = constrain(map(temp, minTemp, maxTemp, 0, 1), 0, 1);
  let c = lerpColor(color(0, 0, 255), color(255, 0, 0), t);
  c.setAlpha(alpha);
  return c;
}

// Formatta un numero all'italiana
function fmt(n, decimals) {
  return n.toLocaleString("it-IT", { maximumFractionDigits: decimals || 0 });
}

// Calcolo del layout in base alla finestra
function updateLayout() {
  colW = constrain(width * 0.30, 260, 400);
  rx0 = 35 + colW + 70;
  rx1 = width - 60;
  rowsTop = 140;
  rowsBottom = height - 50;
  rowH = (rowsBottom - rowsTop) / 5;
}

// Titolo e sottotitolo
function drawHeader() {
  let title = myTable.getString(riverRow, "name").toUpperCase();

  push();
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  fill(255);

  // Riduce la dimensione se il nome è lungo, per farlo stare nella pagina
  let ts = 44;
  for (let s = 44; s >= 16; s -= 2) {
    textSize(s);
    ts = s;
    if (textWidth(title) <= width - 160) break;
  }
  text(title, width / 2, 28);

  fill(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
  textSize(14);
  textStyle(NORMAL);
  text(myTable.getString(riverRow, "continent") + "  ·  sfocia in " + myTable.getString(riverRow, "outflow"),
       width / 2, 28 + ts + 12);
  pop();
}

// Bottone "torna alla visione d'insieme"
function isOverBackButton() {
  return mouseX > backBtn.x && mouseX < backBtn.x + backBtn.w &&
         mouseY > backBtn.y && mouseY < backBtn.y + backBtn.h;
}

function drawBackButton() {
  let over = isOverBackButton();
  push();
  strokeWeight(1);
  if (over) {
    fill(CYAN[0], CYAN[1], CYAN[2]);
    stroke(CYAN[0], CYAN[1], CYAN[2]);
  } else {
    noFill();
    stroke(255, 77);
  }
  rect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);

  noStroke();
  fill(over ? 0 : 255);
  textSize(40);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  text("←", backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2);
  pop();
}


// Colonna sinistra: cerchio grande del fiume + scheda informativa
function drawHero() {
  let discharge = myTable.getNum(riverRow, "discharge");
  let temp = myTable.getNum(riverRow, "avg_temp");

  let maxD = constrain(min(colW - 20, height * 0.36), 140, 300);
  let cx = 35 + colW / 2;
  let cy = rowsTop + 20 + maxD / 2;
  let d = map(sqrt(discharge), sqrt(minDischarge), sqrt(maxDischarge), 24, maxD);

  push();
  // Contorno di riferimento: la portata massima del dataset (come i cerchi vuoti della legenda)
  noFill();
  stroke(255, 90);
  strokeWeight(1);
  ellipse(cx, cy, maxD, maxD);

  // Cerchio del fiume
  fill(getRiverColor(temp, 220));
  stroke(255, 200);
  strokeWeight(1);
  ellipse(cx, cy, d, d);


  // Scheda informativa
  let ty = cy + maxD / 2 + 74;
  textAlign(LEFT, TOP);
  fill(255);
  textSize(22);
  textStyle(NORMAL);
  text("Paesi attraversati", 65, ty);

  fill(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
  textSize(13);
  textStyle(NORMAL);
  text(myTable.getString(riverRow, "countries"), 65, ty + 40, colW, max(40, height - ty - 40));
  pop();
}

// Intestazione di una riga: etichetta a sinistra, valore e confronto a destra
function drawRowHeader(y0, label, valueStr, detailStr) {
  push();
  // Linea chiara di separazione (come le corsie dei continenti)
  stroke(230);
  strokeWeight(1);
  line(rx0, y0, rx1, y0);

  noStroke();
  fill(255);
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(label, rx0, y0 + 8);

  // Dettaglio allineato a destra, valore (bold) alla sua sinistra
  fill(SLATE_LIGHT[0], SLATE_LIGHT[1], SLATE_LIGHT[2]);
  textSize(11);
  textStyle(NORMAL);
  textAlign(RIGHT, TOP);
  text(detailStr, rx1, y0 + 9);
  let w1 = textWidth(detailStr);

  fill(255);
  textSize(13);
  textStyle(BOLD);
  text(valueStr, rx1 - w1 - 16, y0 + 8);
  pop();
}

// Riga di una metrica: striscia con tutti i fiumi (puntini), media e fiume selezionato
function drawMetricRow(m, y0) {
  let val = myTable.getNum(riverRow, metrics[m]);
  let diff = (val / metricAvg[m] - 1) * 100;
  let diffStr = (diff >= 0 ? "+" : "−") + fmt(abs(diff), 0) + "% rispetto alla media";
  let detail = metricRank[m] + "° su " + numRivers + "  ·  " + diffStr;

  drawRowHeader(y0, metricLabels[m], fmt(val) + metricUnits[m], detail);

  let zoneTop = y0 + 38;
  let zoneBottom = y0 + rowH - 22;
  let yS = (zoneTop + zoneBottom) / 2;
  let zoneH = zoneBottom - zoneTop;

  push();
  // Griglia verticale e valori dell'asse
  for (let k = 0; k <= 4; k++) {
    let f = k / 4;
    let x = map(f, 0, 1, rx0, rx1);
    stroke(50);
    strokeWeight(1);
    line(x, zoneTop, x, zoneBottom);

    let v = (m === 0) ? f * metricMax[0] : f * f * metricMax[m];
    noStroke();
    fill(255);
    textSize(10);
    textStyle(NORMAL);
    textAlign(CENTER, TOP);
    text(fmt(v), x, zoneBottom + 6);
  }

  // Tutti gli altri fiumi del dataset
  noStroke();
  for (let i = 0; i < numRivers; i++) {
    let x = map(scaleValue(myTable.getNum(i, metrics[m]), m), 0, 1, rx0, rx1);
    let jitter = (((i * 37) % 100) / 100 - 0.5) * (zoneH * 0.7);
    fill(getRiverColor(myTable.getNum(i, "avg_temp"), 70));
    ellipse(x, yS + jitter, 6, 6);
  }

  // Media del dataset: linea azzurro elettrico
  let xAvg = map(scaleValue(metricAvg[m], m), 0, 1, rx0, rx1);
  stroke(CYAN[0], CYAN[1], CYAN[2]);
  strokeWeight(1.5);
  line(xAvg, zoneTop - 2, xAvg, zoneBottom);
  noStroke();
  fill(CYAN[0], CYAN[1], CYAN[2]);
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text("media " + fmt(metricAvg[m]), xAvg, zoneTop - 3);

  // Fiume selezionato: linea guida + cerchio
  let xRiver = map(scaleValue(val, m), 0, 1, rx0, rx1);
  let d = min(diameterFromDischarge(myTable.getNum(riverRow, "discharge")), zoneH * 0.95);
  stroke(SLATE[0], SLATE[1], SLATE[2], 120);
  strokeWeight(1);
  line(xRiver, zoneTop, xRiver, zoneBottom);
  fill(getRiverColor(myTable.getNum(riverRow, "avg_temp"), 255));
  stroke(255);
  strokeWeight(2);
  ellipse(xRiver, yS, d, d);
  pop();
}

// Riga della temperatura: barra a gradiente (come la legenda dell'index)
function drawTempRow(y0) {
  let tMin = myTable.getNum(riverRow, "min_temp");
  let tMax = myTable.getNum(riverRow, "max_temp");
  let tAvg = myTable.getNum(riverRow, "avg_temp");
  let diff = tAvg - avgTempDataset;
  let diffStr = (diff >= 0 ? "+" : "−") + fmt(abs(diff), 1) + " °C rispetto alla media";
  let detail = "da " + fmt(tMin) + " a " + fmt(tMax) + " °C  ·  " + diffStr;

  drawRowHeader(y0, "Temperatura media", fmt(tAvg, 1) + " °C", detail);

  let zoneTop = y0 + 38;
  let zoneBottom = y0 + rowH - 22;
  let yS = (zoneTop + zoneBottom) / 2 - 6;

  push();
  // Barra a gradiente
  for (let x = rx0; x <= rx1; x++) {
    let temp = map(x, rx0, rx1, tempLow, tempHigh);
    stroke(getRiverColor(temp, 255));
    line(x, yS - 5, x, yS + 5);
  }

  // Valori dell'asse
  for (let k = 0; k <= 4; k++) {
    let x = map(k / 4, 0, 1, rx0, rx1);
    stroke(255);
    strokeWeight(1);
    line(x, yS + 5, x, yS + 9);
    noStroke();
    fill(255);
    textSize(10);
    textStyle(NORMAL);
    textAlign(CENTER, TOP);
    text(fmt(map(k / 4, 0, 1, tempLow, tempHigh)) + " °C", x, zoneBottom + 6);
  }

  // Intervallo di temperatura del fiume
  let xMin = map(tMin, tempLow, tempHigh, rx0, rx1);
  let xMax = map(tMax, tempLow, tempHigh, rx0, rx1);
  let xAvg = map(tAvg, tempLow, tempHigh, rx0, rx1);
  stroke(255);
  strokeWeight(3);
  line(xMin, yS + 18, xMax, yS + 18);
  strokeWeight(1);
  line(xMin, yS + 13, xMin, yS + 23);
  line(xMax, yS + 13, xMax, yS + 23);

  // Media di temperatura del dataset
  let xDs = map(avgTempDataset, tempLow, tempHigh, rx0, rx1);
  stroke(CYAN[0], CYAN[1], CYAN[2]);
  strokeWeight(1.5);
  line(xDs, zoneTop - 2, xDs, yS + 10);
  noStroke();
  fill(CYAN[0], CYAN[1], CYAN[2]);
  textSize(9);
  textAlign(CENTER, BOTTOM);
  text("media " + fmt(avgTempDataset, 1) + " °C", xDs, zoneTop - 3);

  // Cerchio con la temperatura media del fiume
  fill(getRiverColor(tAvg, 255));
  stroke(255);
  strokeWeight(2);
  ellipse(xAvg, yS, 18, 18);
  pop();
}

// Ciclo di disegno principale
function draw() {
  background(25);
  updateLayout();

  if (riverRow === -1) {
    drawNotFound();
    drawBackButton();
    cursor(isOverBackButton() ? HAND : ARROW);
    return;
  }

  drawHeader();
  drawBackButton();
  drawHero();

  for (let m = 0; m < metrics.length; m++) {
    drawMetricRow(m, rowsTop + m * rowH);
  }
  drawTempRow(rowsTop + 4 * rowH);

  // Linea di chiusura in fondo alle righe
  stroke(230);
  strokeWeight(1);
  line(rx0, rowsBottom, rx1, rowsBottom);

  cursor(isOverBackButton() ? HAND : ARROW);
}

// Click sul bottone: ritorno alla visione d'insieme
function mousePressed() {
  if (isOverBackButton()) {
    window.location.href = "index.html";
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
