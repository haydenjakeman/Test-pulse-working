// ================================
// PULSE AI - NEW FAST VERSION
// ================================

import { pipeline, env } from
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

// -------------------------------
// SETTINGS
// -------------------------------

const MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct";

env.allowLocalModels = false;
env.useBrowserCache = true;

let ai = null;
let loading = false;
let generating = false;

// -------------------------------
// ELEMENTS
// -------------------------------

const downloadButton = document.getElementById("downloadButton");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const status = document.getElementById("status");

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const micButton = document.getElementById("micButton");
const talkButton = document.getElementById("talkButton");

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");

// -------------------------------
// DEVICE
// -------------------------------

const hasWebGPU =
  typeof navigator !== "undefined" &&
  !!navigator.gpu;

const DEVICE = hasWebGPU ? "webgpu" : "wasm";

console.log("Pulse device:", DEVICE);

// -------------------------------
// CHAT UI
// -------------------------------

function addMessage(text, who = "ai") {
  if (!chat) return;

  const message = document.createElement("div");

  message.className =
    who === "user"
      ? "message userMessage"
      : "message aiMessage";

  message.textContent = text;

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;

  return message;
}

// -------------------------------
// STATUS
// -------------------------------

function setStatus(text) {
  if (status) {
    status.textContent = text;
  }

  console.log(text);
}

// -------------------------------
// DOWNLOAD / LOAD AI
// -------------------------------

async function loadAI() {

  if (ai) {
    return ai;
  }

  if (loading) {
    return null;
  }

  loading = true;

  if (downloadButton) {
    downloadButton.disabled = true;
    downloadButton.textContent = "Downloading AI...";
  }

  setStatus(
    DEVICE === "webgpu"
      ? "Preparing Pulse with GPU acceleration..."
      : "Preparing Pulse..."
  );

  try {

    ai = await pipeline(
      "text-generation",
      MODEL,
      {
        device: DEVICE,

        // Keep the model relatively small.
        dtype: "q4",

        progress_callback: (progress) => {

          console.log(progress);

          if (
            progress &&
            typeof progress.progress === "number"
          ) {

            const percent =
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(progress.progress)
                )
              );

            if (progressBar) {
              progressBar.value = percent;
              progressBar.style.width =
                percent + "%";
            }

            if (progressText) {
              progressText.textContent =
                percent + "%";
            }

            setStatus(
              "Downloading AI: " +
              percent +
              "%"
            );
          }
        }
      }
    );

    if (downloadButton) {
      downloadButton.textContent =
        "AI Ready ✓";

      downloadButton.disabled = true;
    }

    if (progressBar) {
      progressBar.value = 100;
      progressBar.style.width = "100%";
    }

    if (progressText) {
      progressText.textContent = "100%";
    }

    setStatus(
      "Pulse is ready!"
    );

    localStorage.setItem(
      "pulseAIReady",
      "true"
    );

    return ai;

  } catch (error) {

    console.error(
      "Pulse AI loading error:",
      error
    );

    ai = null;

    if (downloadButton) {
      downloadButton.disabled = false;
      downloadButton.textContent =
        "Download AI Brain";
    }

    setStatus(
      "AI could not load. Tap Download AI Brain again."
    );

    return null;

  } finally {

    loading = false;
  }
}

// -------------------------------
// DOWNLOAD BUTTON
// -------------------------------

if (downloadButton) {

  downloadButton.addEventListener(
    "click",
    async () => {

      await loadAI();

    }
  );
}

// -------------------------------
// GENERATE RESPONSE
// -------------------------------

async function generateReply(userText) {

  if (!userText.trim()) {
    return;
  }

  if (generating) {
    return;
  }

  generating = true;

  try {

    if (!ai) {

      const loaded = await loadAI();

      if (!loaded) {
        return;
      }
    }

    setStatus("Pulse is thinking...");

    const result = await ai(
      [
        {
          role: "system",
          content:
            "You are Pulse, a friendly helpful AI assistant. " +
            "Keep answers concise and natural. " +
            "Do not repeat the user's question."
        },

        {
          role: "user",
          content: userText
        }
      ],
      {
        max_new_tokens: 80,
        temperature: 0.7,
        do_sample: true
      }
    );

    let reply = "";

    if (
      Array.isArray(result) &&
      result.length > 0
    ) {

      const generated =
        result[0].generated_text;

      if (Array.isArray(generated)) {

        const last =
          generated[generated.length - 1];

        if (last && last.content) {
          reply = last.content;
        }

      } else if (
        typeof generated === "string"
      ) {

        reply = generated;

        // Remove the prompt if the model
        // returned it again.
        const marker =
          userText;

        if (
          reply.startsWith(marker)
        ) {

          reply =
            reply.slice(
              marker.length
            );
        }
      }
    }

    reply = reply.trim();

    if (!reply) {
      reply =
        "I couldn't generate a response.";
    }

    addMessage(reply, "ai");

    speak(reply);

    setStatus("Pulse is ready.");

  } catch (error) {

    console.error(
      "Generation error:",
      error
    );

    addMessage(
      "Something went wrong while I was thinking.",
      "ai"
    );

    setStatus(
      "Generation error."
    );

  } finally {

    generating = false;
  }
}

// -------------------------------
// SEND MESSAGE
// -------------------------------

async function sendMessage() {

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) return;

  addMessage(
    text,
    "user"
  );

  input.value = "";

  await generateReply(text);
}

// -------------------------------
// SEND BUTTON
// -------------------------------

if (sendButton) {

  sendButton.addEventListener(
    "click",
    sendMessage
  );
}

// -------------------------------
// ENTER TO SEND
// -------------------------------

if (input) {

  input.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    }
  );
}

// -------------------------------
// SPEECH OUTPUT
// -------------------------------

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.rate = 1;
  utterance.pitch = 1;

  speechSynthesis.speak(
    utterance
  );
}

// -------------------------------
// MICROPHONE
// -------------------------------

let recognition = null;

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.lang = "en-GB";

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.onstart = () => {

    setStatus(
      "Listening..."
    );

    if (micButton) {
      micButton.textContent =
        "🔴";
    }
  };

  recognition.onend = () => {

    if (micButton) {
      micButton.textContent =
        "🎤";
    }
  };

  recognition.onerror = (event) => {

    console.error(
      "Speech error:",
      event.error
    );

    setStatus(
      "Microphone error."
    );
  };

  recognition.onresult = async (event) => {

    const text =
      event.results[0][0].transcript;

    if (input) {
      input.value = text;
    }

    await sendMessage();
  };

}

// -------------------------------
// MIC BUTTON
// -------------------------------

if (micButton) {

  micButton.addEventListener(
    "click",
    () => {

      if (!recognition) {

        setStatus(
          "Voice input isn't supported by this browser."
        );

        return;
      }

      try {

        recognition.start();

      } catch (error) {

        console.log(error);
      }
    }
  );
}

// -------------------------------
// TALK BY ITSELF
// -------------------------------

let talkingByItself = false;

const spontaneousMessages = [
  "Hey, I'm still here.",
  "I wonder what we should build next.",
  "That was interesting.",
  "I'm ready whenever you are.",
  "What should we do next?"
];

if (talkButton) {

  talkButton.addEventListener(
    "click",
    () => {

      talkingByItself =
        !talkingByItself;

      if (talkingByItself) {

        talkButton.textContent =
          "🛑 Stop talking";

        setStatus(
          "Talk by itself is ON."
        );

        startSpontaneousTalk();

      } else {

        talkButton.textContent =
          "🗣️ Talk by itself";

        setStatus(
          "Talk by itself is OFF."
        );

        speechSynthesis.cancel();
      }
    }
  );
}

function startSpontaneousTalk() {

  if (!talkingByItself) {
    return;
  }

  const message =
    spontaneousMessages[
      Math.floor(
        Math.random() *
        spontaneousMessages.length
      )
    ];

  addMessage(
    message,
    "ai"
  );

  speak(message);

  setTimeout(
    startSpontaneousTalk,
    15000
  );
}

// -------------------------------
// IMAGE PREVIEW
// -------------------------------

if (imageInput) {

  imageInput.addEventListener(
    "change",
    () => {

      const file =
        imageInput.files &&
        imageInput.files[0];

      if (!file) {
        return;
      }

      const url =
        URL.createObjectURL(file);

      if (imagePreview) {

        imagePreview.src = url;

        imagePreview.style.display =
          "block";
      }

      if (imagePreviewWrap) {

        imagePreviewWrap.style.display =
          "block";
      }

      setStatus(
        "Image selected."
      );
    }
  );
}

// -------------------------------
// ROBOT COMMANDS
// -------------------------------

const ROBOT_URL = "";

function detectMovement(text) {

  const t =
    text.toLowerCase();

  if (
    t.includes("stop") ||
    t.includes("don't move") ||
    t.includes("do not move")
  ) {
    return "STOP";
  }

  if (
    t.includes("forward") ||
    t.includes("go forward") ||
    t.includes("move forward")
  ) {
    return "FORWARD";
  }

  if (
    t.includes("backward") ||
    t.includes("backwards") ||
    t.includes("go back")
  ) {
    return "BACKWARD";
  }

  if (
    t.includes("turn left") ||
    t.includes("go left")
  ) {
    return "LEFT";
  }

  if (
    t.includes("turn right") ||
    t.includes("go right")
  ) {
    return "RIGHT";
  }

  return null;
}

function getDuration(text) {

  const match =
    text.match(
      /(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|secs)/i
    );

  if (!match) {
    return 1;
  }

  return Math.min(
    Number(match[1]),
    10
  );
}

async function sendRobotCommand(
  command,
  duration
) {

  if (!ROBOT_URL) {

    console.log(
      "Robot command:",
      command,
      "Duration:",
      duration
    );

    return;
  }

  try {

    await fetch(
      ROBOT_URL + "/robot",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          command,
          duration
        })
      }
    );

  } catch (error) {

    console.error(
      "Robot connection error:",
      error
    );
  }
}

// -------------------------------
// CHECK ROBOT COMMAND
// -------------------------------

const originalGenerate =
  generateReply;

generateReply =
  async function(text) {

    const command =
      detectMovement(text);

    if (command) {

      const duration =
        getDuration(text);

      await sendRobotCommand(
        command,
        duration
      );

      addMessage(
        "Robot command: " +
        command +
        " for " +
        duration +
        " second" +
        (duration === 1 ? "" : "s") +
        ".",
        "ai"
      );
    }

    await originalGenerate(text);
  };

// -------------------------------
// STARTUP
// -------------------------------

setStatus(
  "Pulse loaded. Download the AI Brain to begin."
);

if (progressBar) {
  progressBar.value = 0;
}

console.log(
  "Pulse loaded successfully."
);

console.log(
  "WebGPU available:",
  hasWebGPU
);
