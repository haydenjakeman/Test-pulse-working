import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "Xenova/LaMini-T5-61M";

const ROBOT_URL = "";

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const form = document.getElementById("chatForm");

const sendButton = document.getElementById("sendButton");
const micButton = document.getElementById("micButton");
const talkButton = document.getElementById("talkButton");

const statusText = document.getElementById("status");

const downloadPanel = document.getElementById("downloadPanel");
const downloadButton = document.getElementById("downloadButton");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const imageInput = document.getElementById("imageInput");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");

let generator = null;
let loading = false;
let talkByItself = false;


// ==============================
// UI
// ==============================

function setStatus(text) {
    if (statusText) {
        statusText.textContent = text;
    }
}


function addMessage(name, text, isUser = false) {

    if (!chat) return;

    const message = document.createElement("div");

    message.className =
        isUser
            ? "message user-message"
            : "message pulse-message";

    const title = document.createElement("strong");
    title.textContent = name;

    const body = document.createElement("span");
    body.textContent = text;

    message.appendChild(title);
    message.appendChild(body);

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


// ==============================
// DOWNLOAD AI
// ==============================

async function downloadAI() {

    if (loading) {
        return;
    }

    if (generator) {
        addMessage(
            "Pulse",
            "My AI brain is already downloaded."
        );
        return;
    }

    loading = true;

    downloadButton.disabled = true;

    downloadButton.textContent =
        "Downloading...";

    progressText.textContent =
        "Connecting to AI model...";

    progressBar.style.width =
        "0%";

    setStatus(
        "Downloading AI brain..."
    );

    try {

        generator = await pipeline(
            "text2text-generation",
            MODEL,
            {

                progress_callback: (info) => {

                    console.log(
                        "Download:",
                        info
                    );

                    if (
                        typeof info.progress ===
                        "number"
                    ) {

                        let percent =
                            Math.round(
                                info.progress
                            );

                        percent =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    percent
                                )
                            );

                        progressBar.style.width =
                            percent + "%";

                        progressText.textContent =
                            `Downloading AI brain... ${percent}%`;
                    }
                }

            }
        );


        progressBar.style.width =
            "100%";

        progressText.textContent =
            "AI brain downloaded successfully!";

        downloadButton.textContent =
            "AI Brain Ready";

        setStatus(
            "AI ready"
        );

        setTimeout(() => {

            if (downloadPanel) {
                downloadPanel.classList.add(
                    "hidden"
                );
            }

        }, 1000);


        addMessage(
            "Pulse",
            "My AI brain is ready! You can talk to me now."
        );


    } catch (error) {

        console.error(
            "AI DOWNLOAD ERROR:",
            error
        );

        generator = null;

        downloadButton.disabled =
            false;

        downloadButton.textContent =
            "Try Download Again";

        progressBar.style.width =
            "0%";

        progressText.textContent =
            "Download failed. Check your internet connection and try again.";

        setStatus(
            "Download failed"
        );

        addMessage(
            "Pulse",
            "I couldn't download my AI brain. Try the button again."
        );

    } finally {

        loading = false;
    }
}


// IMPORTANT:
// Connect the button AFTER the page has loaded.

if (downloadButton) {

    downloadButton.addEventListener(
        "click",
        downloadAI
    );

}


// ==============================
// LOAD AI
// ==============================

async function getAI() {

    if (generator) {
        return generator;
    }

    await downloadAI();

    return generator;
}


// ==============================
// GENERATE RESPONSE
// ==============================

async function generateReply(text) {

    const ai =
        await getAI();

    if (!ai) {

        return "My AI brain isn't ready yet.";
    }

    try {

        const result =
            await ai(
                text,
                {
                    max_new_tokens: 80,
                    temperature: 0.7
                }
            );

        if (
            result &&
            result[0] &&
            result[0].generated_text
        ) {

            return result[0]
                .generated_text
                .trim();
        }

        return "I'm not sure what to say.";

    } catch (error) {

        console.error(
            "AI RESPONSE ERROR:",
            error
        );

        return "Something went wrong while I was thinking.";
    }
}


// ==============================
// SEND MESSAGE
// ==============================

async function sendMessage() {

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    input.value = "";

    addMessage(
        "You",
        text,
        true
    );

    setStatus(
        "Thinking..."
    );

    sendButton.disabled =
        true;


    // Robot commands

    const movement =
        detectMovement(text);

    if (movement) {

        const duration =
            getDuration(text);

        await sendRobotCommand(
            movement,
            duration
        );

        addMessage(
            "Pulse",
            `Robot command: ${movement} for ${duration} second${duration === 1 ? "" : "s"}.`
        );

        setStatus("Ready");

        sendButton.disabled =
            false;

        return;
    }


    // Normal AI

    const reply =
        await generateReply(text);

    addMessage(
        "Pulse",
        reply
    );

    speak(reply);

    setStatus(
        "Ready"
    );

    sendButton.disabled =
        false;
}


// ==============================
// FORM / SEND
// ==============================

if (form) {

    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            sendMessage();

        }
    );

}


// ==============================
// ROBOT
// ==============================

function detectMovement(text) {

    const t =
        text.toLowerCase();

    if (
        t.includes("stop") ||
        t.includes("halt")
    ) {
        return "STOP";
    }

    if (
        t.includes("forward") ||
        t.includes("go forward")
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
        t.includes("left")
    ) {
        return "LEFT";
    }

    if (
        t.includes("turn right") ||
        t.includes("right")
    ) {
        return "RIGHT";
    }

    return null;
}


function getDuration(text) {

    const match =
        text.match(
            /(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i
        );

    if (!match) {
        return 1;
    }

    return Math.min(
        10,
        Math.max(
            0.1,
            Number(match[1])
        )
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
            "Robot error:",
            error
        );
    }
}


// ==============================
// MICROPHONE
// ==============================

if (micButton) {

    micButton.addEventListener(
        "click",
        () => {

            const SpeechRecognition =
                window.SpeechRecognition ||
                window.webkitSpeechRecognition;

            if (!SpeechRecognition) {

                addMessage(
                    "Pulse",
                    "Voice input isn't supported by this browser."
                );

                return;
            }

            const recognition =
                new SpeechRecognition();

            recognition.lang =
                "en-GB";

            recognition.interimResults =
                false;

            recognition.maxAlternatives =
                1;

            micButton.textContent =
                "⏺️";

            setStatus(
                "Listening..."
            );


            recognition.onresult =
                (event) => {

                    input.value =
                        event.results[0][0]
                            .transcript;

                    sendMessage();
                };


            recognition.onerror =
                () => {

                    micButton.textContent =
                        "🎤";

                    setStatus(
                        "Ready"
                    );
                };


            recognition.onend =
                () => {

                    micButton.textContent =
                        "🎤";

                    setStatus(
                        "Ready"
                    );
                };


            recognition.start();

        }
    );

}


// ==============================
// SPEECH
// ==============================

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    window.speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(
            text
        );

    speech.lang =
        "en-GB";

    speech.rate =
        1;

    speech.pitch =
        1;

    window.speechSynthesis.speak(
        speech
    );
}


// ==============================
// TALK BY ITSELF
// ==============================

if (talkButton) {

    talkButton.addEventListener(
        "click",
        () => {

            talkByItself =
                !talkByItself;

            if (talkByItself) {

                talkButton.textContent =
                    "Stop Talking";

                addMessage(
                    "Pulse",
                    "I'll occasionally talk by myself."
                );

                spontaneousTalk();

            } else {

                talkButton.textContent =
                    "Talk by Itself";

                addMessage(
                    "Pulse",
                    "Okay, I'll stay quiet."
                );
            }

        }
    );
}


function spontaneousTalk() {

    if (!talkByItself) {
        return;
    }

    const thoughts = [

        "Hey, I'm still here.",

        "I wonder what we should build next.",

        "That was a quiet moment.",

        "I'm ready if you want to talk.",

        "I was thinking about the robot.",

        "What should we make next?"
    ];

    const thought =
        thoughts[
            Math.floor(
                Math.random() *
                thoughts.length
            )
        ];

    addMessage(
        "Pulse",
        thought
    );

    speak(thought);

    const delay =
        15000 +
        Math.random() * 30000;

    setTimeout(
        spontaneousTalk,
        delay
    );
}


// ==============================
// CAMERA / IMAGE
// ==============================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        () => {

            const file =
                imageInput.files?.[0];

            if (!file) {
                return;
            }

            const url =
                URL.createObjectURL(
                    file
                );

            imagePreview.src =
                url;

            imagePreviewWrap.classList.remove(
                "hidden"
            );

            addMessage(
                "Pulse",
                "I received the picture. This version can display images, but the current small AI model can't understand images yet."
            );
        }
    );
}


// ==============================
// START
// ==============================

setStatus("Ready");

console.log(
    "Pulse loaded successfully."
);
