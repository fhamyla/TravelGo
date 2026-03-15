// script.js
// Copyright (c) 2024 fhamyla
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// script.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    let submitCount = 0;
    let windowStart = Date.now();
    const MAX_SUBMITS = 3;
    const WINDOW_MS = 5 * 60 * 1000;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const now = Date.now();
        if (now - windowStart > WINDOW_MS) {
            submitCount = 0;
            windowStart = now;
        }

        if (submitCount >= MAX_SUBMITS) {
            alert("Too many submissions. Please wait 5 minutes before trying again.");
            return;
        }

        const name = document.querySelector("input[name='name']").value.trim();
        const email = document.querySelector("input[name='email']").value.trim();
        const website = document.querySelector("input[name='website']")?.value || "";

        if (!name || !email) {
            alert("Please fill in all fields.");
            return;
        }

        if (!validateEmail(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        submitCount++;

        try {
            const url = window.location.hostname === "localhost"
                ? "http://localhost:8888/.netlify/functions/send"
                : "/.netlify/functions/send";

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, website }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error("Invalid server response");
            }

            if (response.ok) {
                alert(data.message || "Email sent successfully!");
                form.reset();
            } else {
                submitCount--;
                throw new Error(data.message || "Server error");
            }
        } catch (error) {
            alert("Error sending message. Please try again.");
            console.error(error);
        }
    });
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}