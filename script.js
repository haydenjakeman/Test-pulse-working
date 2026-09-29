// ===============================
// PULSE AI
// ===============================

// IMPORTANT:
// This script is an ES module, so it loads the AI library
// only after the page itself is working.

import { pipeline, env } from
"https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "Xenova/LaMini-T5-61M";

let generator = null;
let loading = false;


// ===============================
// GET ELEMENTS
// ===============================

const downloadButton =
    document.getElementById("downloadButton");

const downloadPanel =
    document.getElementById("downloadPanel");

const progressBar =
    document.getElementById("progressBar");

const progressText =
    document.getElementById("progressText");

const status =
    document.getElementById("status");

const chat =
    document.getElementById("chat");

const input =
    document.getElementById("messageInput");

const form =
    document.getElementById("chatForm");

const sendButton =
    document.getElementById("sendButton");

const micButton =
    document.getElementById("micButton");

const talkButton =
    document.getElementById("talkButton");

const imageInput =
    document.getElementById("imageInput");

const imagePreview =
    document.getElementById("imagePreview");

const imagePreviewWrap =
    document.getElementById("imagePreviewWrap");


// ===============================
// STATUS
// ===============================

function setStatus(text) {

    if (status) {
        status.textContent = text;
    }

}


// ===============================
// MESSAGES
// ===============================

function addMessage(
    name,
    text,
    user = false
) {

    if (!chat) return;

    const message =
        document.createElement("div");

    message.className =
        user
            ? "message user-message"
            : "message pulse-message";

    const title =
        document.createElement("strong");

    title.textContent =
        name;

    const body =
        document.createElement("span");

    body.textContent =
        text;

    message.appendChild(title);
    message.appendChild(body);

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;
}


// ===============================
// DOWNLOAD AI BRAIN
// ===============================

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

    downloadButton.disabled =
        true;

    downloadButton.textContent =
        "Starting download...";

    progressBar.style.width =
        "1%";

    progressText.textContent =
        "Connecting to the AI model...";

    setStatus(
        "Connecting..."
    );

    try {

        console.log(
            "Starting AI download..."
        );

        generator =
            await pipeline(
                "text2text-generation",
                MODEL,
                {

                    progress_callback:
                        function(info) {

                            console.log(
                                "Download progress:",
                                info
                            );

                            if (
                                typeof info.progress ===
                                "number"
                            ) {

                                const percent =
                                    Math.round(
                                        info.progress
                                    );

                                progressBar.style.width =
                                    percent + "%";

                                progressText.textContent =
                                    "Downloading AI brain... " +
                                    percent +
                                    "%";
                            }

                        }

                }
            );


        // SUCCESS

        progressBar.style.width =
            "100%";

        progressText.textContent =
            "AI brain downloaded!";

        downloadButton.textContent =
            "AI Brain Ready";

        setStatus(
            "AI Ready"
        );

        addMessage(
            "Pulse",
            "My AI brain is ready!"
        );

        setTimeout(
            function() {

                downloadPanel.classList.add(
                    "hidden"
                );

            },
            800
        );


    } catch (error) {

        console.error(
            "DOWNLOAD ERROR:",
            error
        );

        generator =
            null;

        downloadButton.disabled =
            false;

        downloadButton.textContent =
            "Download AI Brain";

        progressBar.style.width =
            "0%";

        progressText.textContent =
            "Something stopped the download. Check the browser console for the error.";

        setStatus(
            "Download error"
        );

    }

    loading =
        false;
}


// ===============================
// BUTTON
// ===============================

if (downloadButton) {

    console.log(
        "Download button found."
    );

    downloadButton.addEventListener(
        "click",
        downloadAI
    );

} else {

    console.error(
        "DOWNLOAD BUTTON NOT FOUND!"
    );

}


// ===============================
// AI RESPONSE
// ===============================

async function generateReply(text) {

    if (!generator) {

        await downloadAI();
    }

    if (!generator) {

        return "My AI brain isn't ready yet.";
    }

    try {

        const result =
            await generator(
                text,
                {
                    max_new_tokens: 80,
                    temperature: 0.7
                }
            );

        return (
            result?.[0]?.generated_text?.trim()
            ||
            "I'm not sure what to say."
        );

    } catch (error) {

        console.error(
            "AI RESPONSE ERROR:",
            error
        );

        return "Something went wrong while I was thinking.";
    }
}


// ===============================
// SEND MESSAGE
// ===============================

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


// ===============================
// CHAT FORM
// ===============================

if (form) {

    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            sendMessage();

        }
    );
}


// ===============================
// SPEECH
// ===============================

function speak(text) {

    if (
        !window.speechSynthesis
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

    window.speechSynthesis.speak(
        speech
    );
}


// ===============================
// MICROPHONE
// ===============================

if (micButton) {

    micButton.addEventListener(
        "click",
        function() {

            const Recognition =
                window.SpeechRecognition ||
                window.webkitSpeechRecognition;

            if (!Recognition) {

                addMessage(
                    "Pulse",
                    "Your browser doesn't support voice input."
                );

                return;
            }

            const recognition =
                new Recognition();

            recognition.lang =
                "en-GB";

            recognition.interimResults =
                false;

            micButton.textContent =
                "🔴";

            setStatus(
                "Listening..."
            );

            recognition.onresult =
                function(event) {

                    input.value =
                        event.results[0][0]
                            .transcript;

                    sendMessage();
                };

            recognition.onend =
                function() {

                    micButton.textContent =
                        "🎤";

                    setStatus(
                        "Ready"
                    );
                };

            recognition.onerror =
                function() {

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


// ===============================
// TALK BY ITSELF
// ===============================

let talking =
    false;

if (talkButton) {

    talkButton.addEventListener(
        "click",
        function() {

            talking =
                !talking;

            if (talking) {

                talkButton.textContent =
                    "Stop Talking";

                addMessage(
                    "Pulse",
                    "I'll talk by myself sometimes."
                );

                spontaneousTalk();

            } else {

                talkButton.textContent =
                    "Talk by Itself";

                addMessage(
                    "Pulse",
                    "Okay, I'll be quiet."
                );
            }

        }
    );
}


function spontaneousTalk() {

    if (!talking) {
        return;
    }

    const things = [

        "Hey, I'm still here.",

        "What should we build next?",

        "I was thinking about the robot.",

        "That was quiet.",

        "I'm ready to talk."

    ];

    const text =
        things[
            Math.floor(
                Math.random() *
                things.length
            )
        ];

    addMessage(
        "Pulse",
        text
    );

    speak(text);

    setTimeout(
        spontaneousTalk,
        15000 +
        Math.random() * 30000
    );
}


// ===============================
// IMAGE
// ===============================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        function() {

            const file =
                imageInput.files?.[0];

            if (!file) {
                return;
            }

            imagePreview.src =
                URL.createObjectURL(file);

            imagePreviewWrap.classList.remove(
                "hidden"
            );

            addMessage(
                "Pulse",
                "I received your picture. This version can display it, but the small AI model doesn't understand images yet."
            );
        }
    );
}


// ===============================
// STARTUP
// ===============================

setStatus(
    "Ready"
);

console.log(
    "PULSE SCRIPT LOADED SUCCESSFULLY"
);
