const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwawOAjlKHjlmEhLbVsX3eK8ALNp_bDylfAg9m3dP9XbBGSTk-VxNSh4sOvM0izAJYOeg/exec";

const BOT_REPLY_DELAY = 600;

let activity = null;
let stepsById = new Map();
let isProcessing = false;

const pageTitle = document.getElementById("pageTitle");
const restartButton = document.getElementById("restartButton");

const loadingScreen =
  document.getElementById("loadingScreen");

const errorScreen =
  document.getElementById("errorScreen");

const errorMessage =
  document.getElementById("errorMessage");

const chatScreen =
  document.getElementById("chatScreen");

const messages =
  document.getElementById("messages");


async function initialize() {
  const params =
    new URLSearchParams(window.location.search);

  const slug = String(params.get("id") || "").trim();

  if (!slug) {
    showError("網址缺少活動 id。");
    return;
  }

  try {
    const requestUrl =
      `${APPS_SCRIPT_URL}?id=${encodeURIComponent(slug)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `資料讀取失敗：HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.error || "找不到活動"
      );
    }

    if (!data.activity) {
      throw new Error("活動基本資料不存在");
    }

    if (!Array.isArray(data.steps)) {
      throw new Error("對話步驟格式錯誤");
    }

    activity = data.activity;

    stepsById = new Map();

    data.steps.forEach(step => {
      const stepId =
        String(step.step_id || "").trim();

      if (stepId) {
        stepsById.set(stepId, step);
      }
    });

    pageTitle.textContent =
      activity.title || "互動指引";

    document.title =
      activity.title || "互動指引";

    loadingScreen.classList.add("hidden");
    errorScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    await startConversation();

  } catch (error) {
    console.error("活動載入失敗：", error);

    showError(
      error.message || "活動載入失敗"
    );
  }
}


async function startConversation() {
  isProcessing = false;
  messages.innerHTML = "";

  if (activity.intro) {
    appendBotMessage(activity.intro);
    await wait(350);
  }

  const startStep =
    String(activity.start_step || "step1").trim();

  await showStep(startStep);
}


async function showStep(stepId) {
  if (isProcessing) {
    return;
  }

  const normalizedStepId =
    String(stepId || "").trim();

  const step = stepsById.get(normalizedStepId);

  if (!step) {
    appendBotMessage(
      `系統找不到對話步驟：${normalizedStepId}`
    );
    return;
  }

  isProcessing = true;

  const typingIndicator =
    appendTypingIndicator();

  await wait(BOT_REPLY_DELAY);

  typingIndicator.remove();

  appendBotMessage(
    step.message || "尚未設定訊息內容",
    Array.isArray(step.options)
      ? step.options
      : []
  );

  isProcessing = false;
}


function appendBotMessage(message, options = []) {
  const row = document.createElement("div");
  row.className = "message-row bot-row";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🙏";

  const group = document.createElement("div");
  group.className = "message-group";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble bot-bubble";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = message;

  bubble.appendChild(text);
  group.appendChild(bubble);

  if (options.length > 0) {
    const optionsBox = document.createElement("div");
    optionsBox.className = "options-box";

    options.forEach(option => {
      const label =
        String(option.label || "").trim();

      const next =
        String(option.next || "").trim();

      if (!label || !next) {
        return;
      }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "option-button";
      button.textContent = label;

      button.addEventListener("click", () => {
        handleOptionClick({
          label,
          next,
          optionsBox
        });
      });

      optionsBox.appendChild(button);
    });

    group.appendChild(optionsBox);
  }

  row.appendChild(avatar);
  row.appendChild(group);

  messages.appendChild(row);

  scrollToBottom();
}


async function handleOptionClick({
  label,
  next,
  optionsBox
}) {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  const buttons =
    optionsBox.querySelectorAll("button");

  buttons.forEach(button => {
    button.disabled = true;
  });

  optionsBox.classList.add("used-options");

  appendUserMessage(label);

  await wait(350);

  if (next.toUpperCase() === "LINE") {
    appendLineMessage();
    isProcessing = false;
    return;
  }

  isProcessing = false;

  await showStep(next);
}


function appendUserMessage(message) {
  const row = document.createElement("div");
  row.className = "message-row user-row";

  const bubble = document.createElement("div");
  bubble.className =
    "message-bubble user-bubble";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = message;

  bubble.appendChild(text);
  row.appendChild(bubble);

  messages.appendChild(row);

  scrollToBottom();
}


function appendLineMessage() {
  const row = document.createElement("div");
  row.className = "message-row bot-row";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🙏";

  const group = document.createElement("div");
  group.className = "message-group";

  const bubble = document.createElement("div");
  bubble.className =
    "message-bubble bot-bubble";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent =
    "點擊下方按鈕，即可前往 LINE 進行預約或諮詢。";

  bubble.appendChild(text);
  group.appendChild(bubble);

  const lineUrl =
    String(activity.line_url || "").trim();

  if (lineUrl) {
    const link = document.createElement("a");

    link.className = "line-button";
    link.href = lineUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "💬 前往 LINE";

    group.appendChild(link);

  } else {
    const warning = document.createElement("div");

    warning.className = "line-button disabled";
    warning.textContent = "尚未設定 LINE 連結";

    group.appendChild(warning);
  }

  row.appendChild(avatar);
  row.appendChild(group);

  messages.appendChild(row);

  scrollToBottom();
}


function appendTypingIndicator() {
  const row = document.createElement("div");
  row.className =
    "message-row bot-row typing-row";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🙏";

  const bubble = document.createElement("div");
  bubble.className =
    "message-bubble bot-bubble typing-bubble";

  for (let index = 0; index < 3; index++) {
    const dot = document.createElement("span");
    bubble.appendChild(dot);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);

  messages.appendChild(row);

  scrollToBottom();

  return row;
}


function showError(message) {
  loadingScreen.classList.add("hidden");
  chatScreen.classList.add("hidden");
  errorScreen.classList.remove("hidden");

  errorMessage.textContent = message;
}


function scrollToBottom() {
  requestAnimationFrame(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  });
}


function wait(milliseconds) {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds);
  });
}


restartButton.addEventListener("click", () => {
  if (activity) {
    startConversation();
  }
});


initialize();
