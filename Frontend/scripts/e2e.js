import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const frontendDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const backendDir = path.resolve(frontendDir, "../Backend");
const outputDir = path.join(frontendDir, "output", "e2e");
const apiPort = Number(process.env.E2E_API_PORT || 18080);
const webPort = Number(process.env.E2E_WEB_PORT || 15173);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const children = new Set();
const consoleErrors = [];
const results = [];
let browser;
let backend;
let temporaryDir;
let isolatedJar;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function launch(command, args, options = {}) {
  const child = spawn(command, args, { windowsHide: true, ...options });
  children.add(child);
  child.on("error", (error) => { child.launchError = error; });
  child.on("exit", () => children.delete(child));
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 10000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
    child.kill("SIGTERM");
  });
}

async function unusedPort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () => reject(new Error(`Port ${port} is occupied; choose E2E_API_PORT/E2E_WEB_PORT.`)));
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

async function ready(url, child, timeout = 120000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (child.launchError) throw child.launchError;
    if (child.exitCode !== null) throw new Error(`Server exited (${child.exitCode}); inspect output/e2e logs.`);
    try { if ((await fetch(url)).ok) return; } catch { /* server still starting */ }
    await pause(250);
  }
  throw new Error(`Timed out waiting for ${url}; inspect output/e2e logs.`);
}

async function packageBackend() {
  if (process.env.E2E_SKIP_BUILD === "1") return;
  const log = createWriteStream(path.join(outputDir, "backend-build.log"));
  const windows = process.platform === "win32";
  const command = windows ? path.join(backendDir, "mvnw.cmd") : "bash";
  const args = windows ? ["-DskipTests", "package"] : ["./mvnw", "-DskipTests", "package"];
  const child = launch(command, args, {
    cwd: backendDir, shell: windows, env: process.env,
  });
  child.stdout.pipe(log); child.stderr.pipe(log);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject); child.once("exit", resolve);
  });
  log.end();
  assert.equal(code, 0, "Backend packaging failed; inspect output/e2e/backend-build.log");
}

async function startBackend() {
  const log = createWriteStream(path.join(outputDir, "backend.log"), { flags: "a" });
  const child = launch("java", ["-jar", isolatedJar], {
    cwd: backendDir,
    env: {
      ...process.env,
      SERVER_PORT: String(apiPort),
      SPRING_DATASOURCE_URL: `jdbc:h2:file:${path.join(temporaryDir, "game").replaceAll("\\", "/")};WRITE_DELAY=0`,
      SPRING_JPA_HIBERNATE_DDL_AUTO: "update",
      SPRING_JPA_SHOW_SQL: "false",
      SPRING_H2_CONSOLE_ENABLED: "false",
      JWT_SECRET: "e2e-isolated-secret-never-used-for-normal-gameplay",
      APP_CORS_ALLOWED_ORIGINS: webUrl,
    },
  });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once("exit", () => log.end());
  await ready(`${apiUrl}/api/health`, child);
  return child;
}

async function gameState(page) {
  return page.evaluate(() => typeof window.render_game_to_text === "function" ? JSON.parse(window.render_game_to_text()) : null);
}

async function waitQuestion(page, previousId = null) {
  await page.waitForFunction((oldId) => {
    if (!window.render_game_to_text) return false;
    const state = JSON.parse(window.render_game_to_text());
    return state.question?.id && state.question.id !== oldId && !["loading", "submitting", "ending", "error"].includes(state.phase);
  }, previousId, { timeout: 15000 });
  return gameState(page);
}

function carryMarks(q) {
  if (q.denominatorA != null || !["+", "-"].includes(q.operatorSymbol)) return [];
  const marks = Array(q.questionColumns).fill(false);
  let a = q.a, b = q.b, carry = 0;
  for (let column = marks.length - 1; column >= 0; column -= 1) {
    const needed = q.operatorSymbol === "+" ? a % 10 + b % 10 + carry >= 10 : a % 10 - carry < b % 10;
    marks[column] = needed;
    carry = needed ? 1 : 0;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return marks;
}

async function answerQuestion(page, state, keyboard = false) {
  const q = state.question;
  assert.equal(Object.hasOwn(q, "carryRequiredMap"), false, "The server must keep required carry marks private");
  assert.equal(Object.hasOwn(q, "answerLength"), false, "The server must keep answer hints private");
  if (state.mode === "fraction") {
    const minus = q.operatorSymbol === "-" || q.operatorSymbol === "−";
    const numerator = q.a * q.denominatorB + (minus ? -1 : 1) * q.b * q.denominatorA;
    await page.getByLabel("Numerator", { exact: true }).fill(String(numerator));
    await page.getByLabel("Denominator", { exact: true }).fill(String(q.denominatorA * q.denominatorB));
  } else {
    const answer = state.mode === "add" ? q.a + q.b : state.mode === "sub" ? q.a - q.b : state.mode === "mul" ? q.a * q.b : q.a / q.b;
    await page.getByLabel("Your answer", { exact: true }).fill(String(answer));
    for (const [column, required] of carryMarks(q).entries()) {
      if (required) await page.getByRole("button", { name: new RegExp(`^(Carry|Borrow) for column ${column + 1}$`, "i") }).click();
    }
  }
  if (keyboard) await page.getByLabel("Your answer", { exact: true }).press("Enter");
  else await page.getByRole("button", { name: /submit answer/i }).click();
}

async function readApi(page, endpoint) {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  const response = await fetch(`${apiUrl}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200, endpoint);
  return response.json();
}

async function bundledGameCheck(page, expectedSessionId) {
  // The bundled client has no authentication option. Adapt only its page setup
  // in an ignored temporary copy; keep its action, screenshot and state workflow.
  const skillFile = path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills", "develop-web-game", "scripts", "web_game_playwright_client.js");
  const original = await readFile(skillFile, "utf8").catch(() => null);
  if (!original) return; // CI does not install personal Codex skills.
  const stateFile = path.join(outputDir, "bundled-auth-state.json");
  const clientFile = path.join(outputDir, "bundled-game-client.mjs");
  const screenshotDir = path.join(outputDir, "bundled-game");
  const tabStorage = await page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)));
  await page.context().storageState({ path: stateFile });
  const modified = original.replace("const page = await browser.newPage();", `const page = await browser.newPage({ storageState: ${JSON.stringify(stateFile)} });\n  await page.addInitScript((saved) => { for (const [key, value] of Object.entries(saved)) sessionStorage.setItem(key, value); }, ${JSON.stringify(tabStorage)});`);
  assert.notEqual(modified, original, "Bundled client authentication adapter no longer matches its entrypoint");
  await writeFile(clientFile, modified);
  const child = launch(process.execPath, [clientFile, "--url", `${webUrl}/game/play/add/easy`, "--click-selector", "#game-answer", "--actions-json", JSON.stringify({ steps: [{ buttons: [], frames: 6 }] }), "--iterations", "1", "--screenshot-dir", screenshotDir], { cwd: frontendDir });
  const log = createWriteStream(path.join(outputDir, "bundled-game.log"));
  child.stdout.pipe(log); child.stderr.pipe(log);
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  log.end();
  assert.equal(code, 0, "Bundled web-game client failed; inspect bundled-game.log");
  const captured = JSON.parse(await readFile(path.join(screenshotDir, "state-0.json"), "utf8"));
  assert.equal(captured.sessionId, expectedSessionId);
  assert.equal((await readdir(screenshotDir)).some((name) => name.startsWith("errors-")), false, "Bundled client reported browser errors");
  await rm(stateFile, { force: true });
  await rm(clientFile, { force: true });
  results.push({ scenario: "bundled web-game client screenshot and text state", passed: true });
}

try {
  await mkdir(outputDir, { recursive: true });
  await unusedPort(apiPort); await unusedPort(webPort);
  temporaryDir = await mkdtemp(path.join(os.tmpdir(), "fundigit-e2e-"));
  await packageBackend();
  const jars = (await readdir(path.join(backendDir, "target"))).filter((name) => name.endsWith(".jar"));
  assert.equal(jars.length, 1, "Expected one executable backend jar in Backend/target");
  isolatedJar = path.join(temporaryDir, "backend.jar");
  await copyFile(path.join(backendDir, "target", jars[0]), isolatedJar);
  backend = await startBackend();
  const frontendLog = createWriteStream(path.join(outputDir, "frontend.log"));
  const vite = launch(process.execPath, [path.join(frontendDir, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
    cwd: frontendDir, env: { ...process.env, VITE_API_BASE_URL: apiUrl },
  });
  vite.stdout.pipe(frontendLog); vite.stderr.pipe(frontendLog);
  vite.once("exit", () => frontendLog.end());
  await ready(webUrl, vite);
  browser = await chromium.launch({ headless: process.env.E2E_HEADLESS !== "0" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let intentionalNetworkFault = false;
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !intentionalNetworkFault) consoleErrors.push(message.text());
  });
  const identity = `browser${Date.now()}`;
  const email = `${identity}@example.com`;
  await page.goto(`${webUrl}/signup`);
  await page.getByLabel(/username/i).fill(identity);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("BrowserTest42!");
  await page.getByRole("button", { name: /create account|sign up|join/i }).click();
  await page.waitForURL("**/game");
  results.push({ scenario: "signup", passed: true });
  await page.screenshot({ path: path.join(outputDir, "mode-selection.png"), fullPage: true });
  await page.goto(`${webUrl}/`);
  await page.getByRole("heading", { name: /make every number count/i }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({ path: path.join(outputDir, "home-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(outputDir, "home-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${webUrl}/game/level/fraction`);
  await page.getByRole("heading", { name: /fractions/i }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({ path: path.join(outputDir, "fraction-levels.png"), fullPage: true });

  for (const mode of ["add", "sub", "mul", "div", "fraction"]) {
    for (const level of ["easy", "medium", "hard"]) {
      await page.goto(`${webUrl}/game/play/${mode}/${level}`);
      let state = await waitQuestion(page);
      if (mode === "add" && level === "easy") {
        const originalId = state.sessionId;
        const originalDeadline = state.question.expiresAt;
        await page.reload();
        state = await waitQuestion(page);
        assert.equal(state.sessionId, originalId, "Refresh must resume the same game");
        assert.equal(state.question.expiresAt, originalDeadline, "Refresh must preserve the deadline");
        results.push({ scenario: "refresh resumes the round", passed: true });
        await bundledGameCheck(page, state.sessionId);
        const input = page.getByLabel("Your answer", { exact: true });
        await page.getByRole("button", { name: "7", exact: true }).click();
        assert.equal(await input.inputValue(), "7", "Number pad must enter digits");
        await input.focus(); await input.press("Backspace");
        assert.equal(await input.inputValue(), "", "Backspace must delete a digit");
        await input.fill("12"); await input.press("Escape");
        assert.equal(await input.inputValue(), "", "Escape must clear the answer");
        await page.getByRole("button", { name: "1", exact: true }).click();
        await page.getByRole("button", { name: "Delete", exact: true }).click();
        assert.equal(await input.inputValue(), "", "Keypad Delete must work");
        results.push({ scenario: "keypad, Backspace, Escape, and Enter controls", passed: true });
      }
      if (mode === "fraction" && level === "easy") {
        await page.getByLabel("Numerator", { exact: true }).fill("1");
        await page.getByLabel("Denominator", { exact: true }).fill("0");
        await page.getByRole("button", { name: /submit answer/i }).click();
        assert.match(await page.getByRole("alert").innerText(), /denominator|fraction/i);
        assert.equal((await gameState(page)).question.id, state.question.id, "Invalid fractions must not consume questions");
        results.push({ scenario: "zero denominator rejected without consuming question", passed: true });
      }
      if (mode === "mul" && level === "hard") {
        await page.setViewportSize({ width: 320, height: 850 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Mobile gameplay must fit horizontally");
      }
      await page.screenshot({ path: path.join(outputDir, `${mode}-${level}.png`), fullPage: true });
      if (mode === "mul" && level === "hard") await page.setViewportSize({ width: 1280, height: 900 });
      for (let index = 0; index < 10; index += 1) {
        const oldId = state.question.id;
        await answerQuestion(page, state, mode === "add" && level === "easy" && index === 0);
        if (index < 9) state = await waitQuestion(page, oldId);
        else await page.getByRole("button", { name: /play again/i }).waitFor();
      }
      state = await gameState(page);
      assert.equal(state.score, 100, `${mode}/${level} must award exactly 100 points`);
      assert.equal(state.answeredQuestions, 10);
      results.push({ scenario: `${mode}/${level}: ten correct answers`, passed: true, score: state.score });
      console.log(`PASS ${mode}/${level} (100 points)`);
    }
  }

  await page.getByRole("button", { name: /view leaderboard/i }).click();
  await page.getByText(identity, { exact: true }).first().waitFor();
  await page.getByRole("button", { name: /my history/i }).click();
  await page.getByText(/completed/i).first().waitFor();
  await page.screenshot({ path: path.join(outputDir, "history.png"), fullPage: true });
  assert.equal((await readApi(page, "/api/history?limit=100")).length, 15);

  await page.goto(`${webUrl}/game/play/add/easy`);
  await page.waitForFunction(() => window.render_game_to_text && ["ready", "completed", "abandoned"].includes(JSON.parse(window.render_game_to_text()).phase));
  if (await page.getByRole("button", { name: /play again/i }).count()) await page.getByRole("button", { name: /play again/i }).click();
  let state = await waitQuestion(page);
  const abandonedId = state.sessionId;
  let dropped = false;
  await page.route("**/api/game/sessions/*/answers", async (route) => {
    if (!dropped) {
      dropped = true; intentionalNetworkFault = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await answerQuestion(page, state);
  await page.getByRole("button", { name: /retry request/i }).waitFor();
  await page.reload(); // The persisted pending operation must replay safely.
  await waitQuestion(page, state.question.id);
  await page.unroute("**/api/game/sessions/*/answers");
  intentionalNetworkFault = false;
  await page.getByRole("button", { name: /end game/i }).click();
  await page.getByRole("button", { name: /play again/i }).waitFor();
  const unfinished = (await readApi(page, "/api/history?limit=100")).filter((entry) => entry.status === "ABANDONED");
  assert.equal(unfinished.length, 1);
  assert.equal(unfinished[0].score, 10, "Lost-response retry must not award points twice");
  assert.equal(unfinished[0].answeredQuestions, 1);
  const ranked = await readApi(page, "/api/leaderboard?mode=add&difficulty=easy&limit=100");
  assert.equal(ranked.some((entry) => entry.sessionId === abandonedId || entry.status !== "COMPLETED"), false);
  results.push({ scenario: "lost-response replay after refresh and early exit history only", passed: true });

  await page.goto(`${webUrl}/game/play/add/hard`);
  await page.waitForFunction(() => window.render_game_to_text && ["ready", "completed", "abandoned"].includes(JSON.parse(window.render_game_to_text()).phase));
  if (await page.getByRole("button", { name: /play again/i }).count()) await page.getByRole("button", { name: /play again/i }).click();
  await waitQuestion(page);
  await page.waitForFunction(() => {
    const current = JSON.parse(window.render_game_to_text());
    return current.answeredQuestions === 1 && current.phase === "ready";
  }, null, { timeout: 20000 });
  assert.equal((await gameState(page)).score, 0, "Timeout must earn zero points");
  await page.getByRole("button", { name: /end game/i }).click();
  await page.getByRole("button", { name: /play again/i }).waitFor();
  assert.equal((await readApi(page, "/api/history?limit=100")).length, 17,
    "Ending the timed-out round must save an unfinished history entry");
  results.push({ scenario: "real ten-second deadline advances exactly once for zero points", passed: true });

  await stop(backend);
  backend = await startBackend();
  await page.reload();
  const persisted = await readApi(page, "/api/history?limit=100");
  assert.equal(persisted.length, 17, "History must survive a backend restart");
  assert.equal((await readApi(page, "/api/auth/me")).email, email);
  results.push({ scenario: "accounts and results survive backend restart", passed: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", { name: /open menu|toggle menu|navigation menu/i });
  if (await menu.count()) await menu.click();
  await page.getByRole("button", { name: /logout|log out/i }).last().click();
  await page.waitForURL("**/login");
  await page.goto(`${webUrl}/game`);
  await page.waitForURL("**/login");
  await page.screenshot({ path: path.join(outputDir, "mobile-login.png"), fullPage: true });
  results.push({ scenario: "mobile logout and protected routing", passed: true });
  assert.deepEqual(consoleErrors, [], "Browser must not emit unexpected errors");
  await writeFile(path.join(outputDir, "summary.json"), JSON.stringify({ passed: true, results, consoleErrors }, null, 2));
  console.log(`PASS ${results.length} browser scenarios; screenshots: ${outputDir}`);
} catch (error) {
  await writeFile(path.join(outputDir, "summary.json"), JSON.stringify({ passed: false, error: error.stack, results, consoleErrors }, null, 2)).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const child of children) await stop(child);
  if (temporaryDir && path.dirname(path.resolve(temporaryDir)) === path.resolve(os.tmpdir()) && path.basename(temporaryDir).startsWith("fundigit-e2e-")) {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}
