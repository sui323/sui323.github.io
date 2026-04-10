const chatRoot = document.querySelector("[data-chat-root]");

if (chatRoot) {
  const config = window.CHATBOT_CONFIG || {};
  const feed = chatRoot.querySelector("[data-chat-feed]");
  const form = chatRoot.querySelector("[data-chat-form]");
  const input = chatRoot.querySelector("[data-chat-input]");
  const status = chatRoot.querySelector("[data-chat-status]");
  const promptButtons = chatRoot.querySelectorAll("[data-prompt]");
  const resetButton = chatRoot.querySelector("[data-chat-reset]");
  const sendButton = chatRoot.querySelector("[data-chat-send]");
  const lang = chatRoot.getAttribute("data-chat-lang") || "ko";
  const history = [];

  const setStatus = (message) => {
    status.textContent = message;
  };

  const addMessage = (role, text) => {
    const article = document.createElement("article");
    article.className = `message ${role}`;

    const roleLabel = document.createElement("span");
    roleLabel.className = "message-role";
    roleLabel.textContent = role === "user" ? "You" : "Site Assistant";

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = text;

    article.append(roleLabel, body);
    feed.append(article);
    feed.scrollTop = feed.scrollHeight;
  };

  const clearConversation = () => {
    history.length = 0;
    feed.innerHTML = "";
    addMessage(
      "assistant",
      lang === "ko"
        ? "안녕하세요. 이 사이트의 AI 챗봇입니다. 사이트 소개, 프로젝트 구조, 사용 기술, 연락 방법처럼 공개된 내용을 중심으로 답변할게요."
        : "Hello. I am the AI assistant for this site. I can answer questions about the public profile, site structure, projects, technology, and contact details."
    );
    setStatus(
      config.endpoint && !config.endpoint.includes("your-worker-subdomain")
        ? `${config.modelLabel || "Gemini"} ready`
        : lang === "ko"
          ? "아직 API 엔드포인트가 설정되지 않았습니다."
          : "The API endpoint is not configured yet."
    );
  };

  const sendMessage = async (message) => {
    if (!config.endpoint || config.endpoint.includes("your-worker-subdomain")) {
      setStatus(
        lang === "ko"
          ? "먼저 assets/js/chat-config.js 파일에 Worker URL을 넣어 주세요."
          : "Set your Worker URL in assets/js/chat-config.js first."
      );
      return;
    }

    sendButton.disabled = true;
    setStatus(lang === "ko" ? "답변을 생성하는 중입니다..." : "Generating a reply...");
    addMessage("user", message);
    history.push({ role: "user", text: message });

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          lang,
          history,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const answer =
        data.reply ||
        (lang === "ko" ? "응답을 비워 두고 돌아왔습니다." : "The response came back empty.");

      addMessage("assistant", answer);
      history.push({ role: "assistant", text: answer });
      setStatus(
        lang === "ko"
          ? `${config.modelLabel || "Gemini"} 응답 완료`
          : `Reply complete from ${config.modelLabel || "Gemini"}`
      );
    } catch (error) {
      addMessage(
        "assistant",
        lang === "ko"
          ? `오류가 발생했습니다: ${error.message}`
          : `An error occurred: ${error.message}`
      );
      setStatus(lang === "ko" ? "오류가 발생했습니다." : "Something went wrong.");
    } finally {
      sendButton.disabled = false;
    }
  };

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.getAttribute("data-prompt") || "";
      input.focus();
    });
  });

  resetButton.addEventListener("click", clearConversation);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();

    if (!message) {
      setStatus(lang === "ko" ? "메시지를 입력해 주세요." : "Please enter a message.");
      input.focus();
      return;
    }

    input.value = "";
    await sendMessage(message);
  });

  clearConversation();
}
