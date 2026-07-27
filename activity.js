const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxgkjZC_6ugqV7CLgjoVRQISl7ARIVEVz7eYl0M10BJLbGdYiEdD67JCZr4bWy3_ZcN0w/exec";

async function loadActivity() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const loading = document.getElementById("loading");
  const errorBox = document.getElementById("error");
  const activityBox = document.getElementById("activity");
  const errorMessage = document.getElementById("errorMessage");

  if (!id) {
    showError("網址缺少活動 id。");
    return;
  }

  try {
    const requestUrl =
      `${APPS_SCRIPT_URL}?id=${encodeURIComponent(id)}`;

    const response = await fetch(requestUrl);

    if (!response.ok) {
      throw new Error(`資料讀取失敗：HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "找不到活動");
    }

    const activity = data.activity;

    document.title = activity.title || "活動頁面";

    document.getElementById("title").textContent =
      activity.title || "";

    document.getElementById("subtitle").textContent =
      activity.subtitle || "";

    document.getElementById("question1").textContent =
      activity.question1 || "";

    document.getElementById("question2").textContent =
      activity.question2 || "";

    const lineButton = document.getElementById("lineButton");

    if (activity.line_url) {
      lineButton.href = activity.line_url;
    } else {
      lineButton.classList.add("hidden");
    }

    loading.classList.add("hidden");
    activityBox.classList.remove("hidden");

  } catch (error) {
    console.error(error);
    showError(error.message || "活動資料載入失敗");
  }

  function showError(message) {
    loading.classList.add("hidden");
    activityBox.classList.add("hidden");
    errorBox.classList.remove("hidden");
    errorMessage.textContent = message;
  }
}

loadActivity();
