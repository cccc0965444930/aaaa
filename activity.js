const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxgkjZC_6ugqV7CLgjoVRQISl7ARIVEVz7eYl0M10BJLbGdYiEdD67JCZr4bWy3_ZcN0w/exec";

const REPLY_DELAY_MS = 700;

let activity = null;
let stepsById = new Map();
let running = false;

const elements = {
  pageTitle: document.getElementById("pageTitle"),
  restartButton: document.getElementById("restartButton"),

  loadingScreen:
    document.getElementById("loadingScreen"),

  errorScreen:
    document.getElementById("errorScreen"),

  errorMessage:
    document.getElementById("errorMessage"),

  chatScreen:
    document.getElementById("chatScreen"),

  messages:
    document.getElementById("messages")
};

async function initialize() {
  const params =
    new URLSearchParams(window.location.search);

  const slug = params.get("id");

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

    activity = data.activity;

    stepsById = new Map(
      data.steps.map(step => [
        String(step.step_id).trim(),
        step
      ])
    );

    document.title =
      activity.title || "互動指引";

    elements.pageTitle.textContent =
      activity.title || "互動指引";

    showChat();

    if (activity.intro) {
      await appendBotMessage(activity.intro);
    }

    await showStep(
      activity.start_step || "step1"
    );

  } catch (error) {
    console.error(error);

    showError(
      error.message || "活動內容載入失敗"
    );
  }
}

async function showStep(stepId) {
  if (running) {
    return;
  }

  const step = stepsById.get(
    String(stepId).trim()
  );

  if (!step) {
    await appendBotMessage(
      `找不到對話步驟：${stepId}`
    );
    return;
  }

  running = true;

  const typingElement = showTypingIndicator();

  await wait(REPLY_DELAY_MS);

  typingElement.remove();

  await appendBotMessage(
    step.message,
    step.options
  );

  running = false;
}

async function appendBotMessage(
  message,
  options = []
) {
  const row = document.createElement("div");
  row.className = "message-row bot-row";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🙏";

  const group = document.createElement("div");
  group.className = "message-group";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble bot-bubble";

  const messageText =
    document.createElement("div");

  messageText.className = "message-text";
  messageText.textContent =
    message || "尚未設定訊息內容";

  bubble.appendChild(messageText);
  group.appendChild(bubble);

  if (Array.isArray(options) && options.length > 0) {
    const optionContainer =
      document.createElement("div");

    optionContainer.className =
      "option-container";

    options.forEach(option => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "option-button";
      button.textContent = option.label;

      button.addEventListener("click", () => {
        handleOptionClick(
          option,
          optionContainer
        );
      });

      optionContainer.appendChild(button);
    });

    group.appendChild(optionContainer);
  }

  row.appendChild(avatar);
  row.appendChild(group);

  elements.messages.appendChild(row);

  scrollToBottom();
}

async function handleOptionClick(
  option,
  optionContainer
) {
  if (running) {
    return;
  }

  running = true;

  const buttons =
    optionContainer.querySelectorAll("button");

  buttons.forEach(button => {
    button.disabled = true;
  });

  optionContainer.classList.add(
    "options-disabled"
  );

  appendUserMessage(option.label);

  await wait(350);

  const next =
    String(option.next || "").trim();

  if (next.toUpperCase() === "LINE") {
    showLineButton();
    running = false;
    return;
  }

  running = false;

  await showStep(next);
}

function appendUserMessage(message) {
  const row = document.createElement("div");
  row.className = "message-row user-row";

  const bubble = document.createElement("div");
  bubble.className =
    "message-bubble user-bubble";

  const messageText =
    document.createElement("div");

  messageText.className = "message-text";
  messageText.textContent = message;

  bubble.appendChild(messageText);
  row.appendChild(bubble);

  elements.messages.appendChild(row);

  scrollToBottom();
}

function showLineButton() {
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
  text.textContent =
    "點擊下方按鈕，即可前往 LINE 進行預約或諮詢。";

  bubble.appendChild(text);
  group.appendChild(bubble);

  const lineLink =
    document.createElement("a");

  lineLink.className = "line-button";
  lineLink.textContent = "💬 前往 LINE";

  lineLink.href =
    activity.line_url || "#";

  lineLink.target = "_blank";
  lineLink.rel = "noopener noreferrer";

  if (!activity.line_url) {
    lineLink.classList.add("disabled-link");
    lineLink.removeAttribute("target");
    lineLink.textContent = "尚未設定 LINE 連結";

    lineLink.addEventListener(
      "click",
      event => event.preventDefault()
    );
  }

  group.appendChild(lineLink);

  row.appendChild(avatar);
  row.appendChild(group);

  elements.messages.appendChild(row);

  scrollToBottom();
}

function showTypingIndicator() {
  const row = document.createElement("div");
  row.className =
    "message-row bot-row typing-row";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🙏";

  const bubble = document.createElement("div");
  bubble.className =
    "message-bubble bot-bubble typing-bubble";

  bubble.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);

  elements.messages.appendChild(row);

  scrollToBottom();

  return row;
}

function showChat() {
  elements.loadingScreen.classList.add(
    "hidden"
  );

  elements.errorScreen.classList.add(
    "hidden"
  );

  elements.chatScreen.classList.remove(
    "hidden"
  );
}

function showError(message) {
  elements.loadingScreen.classList.add(
    "hidden"
  );

  elements.chatScreen.classList.add(
    "hidden"
  );

  elements.errorScreen.classList.remove(
    "hidden"
  );

  elements.errorMessage.textContent =
    message;
}

function restartConversation() {
  if (!activity) {
    return;
  }

  running = false;
  elements.messages.innerHTML = "";

  startConversation();
}

async function startConversation() {
  if (activity.intro) {
    await appendBotMessage(activity.intro);
  }

  await showStep(
    activity.start_step || "step1"
  );
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
    setTimeout(resolve, milliseconds);
  });
}

elements.restartButton.addEventListener(
  "click",
  restartConversation
);

initialize();
