// server.js
// Copyright (c) 2024 fhamyla
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
const express = require("express");
const helmet = require("helmet");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
require('dotenv').config();

const app = express();
app.use(express.json({ limit: "10kb" }));

const allowedOrigins = [
    "http://localhost:8888",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://fhamylatravelgo.netlify.app",
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["POST"],
}));

app.use(helmet());

// --- Rate Limiting ---

// 1. IP-based rate limiter (existing, via express-rate-limit)
const ipLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: "Too many requests from this IP, please try again later."
});
app.use('/send', ipLimiter);

// 2. Email-address-based rate limiter (in-memory)
//    Prevents the same email from being submitted more than 3 times per 5 minutes.
const emailRateLimits = new Map();
const EMAIL_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const EMAIL_MAX_REQUESTS_PER_WINDOW = 3;

function isEmailRateLimited(email) {
    const now = Date.now();
    const normalizedEmail = email.trim().toLowerCase();
    const entry = emailRateLimits.get(normalizedEmail) || { count: 0, firstRequestAt: now };

    if (now - entry.firstRequestAt > EMAIL_RATE_LIMIT_WINDOW_MS) {
        entry.count = 1;
        entry.firstRequestAt = now;
    } else {
        entry.count += 1;
    }

    emailRateLimits.set(normalizedEmail, entry);
    return entry.count > EMAIL_MAX_REQUESTS_PER_WINDOW;
}

// 3. Sent-email rate limiter (global, in-memory)
//    Caps the total number of emails actually sent to 3 per 5 minutes.
const sentEmailTimestamps = [];
const SENT_EMAIL_WINDOW_MS = 5 * 60 * 1000;
const SENT_EMAIL_MAX_PER_WINDOW = 3;

function canSendEmail() {
    const now = Date.now();
    // Remove timestamps outside the current window
    while (sentEmailTimestamps.length > 0 && now - sentEmailTimestamps[0] > SENT_EMAIL_WINDOW_MS) {
        sentEmailTimestamps.shift();
    }
    return sentEmailTimestamps.length < SENT_EMAIL_MAX_PER_WINDOW;
}

function recordSentEmail() {
    sentEmailTimestamps.push(Date.now());
}

// Periodic cleanup for the email rate limit map (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of emailRateLimits) {
        if (now - entry.firstRequestAt > EMAIL_RATE_LIMIT_WINDOW_MS) {
            emailRateLimits.delete(key);
        }
    }
}, 10 * 60 * 1000);

// --- Route ---

app.post("/send", [
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required').isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {

    // Honeypot check
    if (req.body.website) {
        return res.status(400).json({ message: "Bot detected" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { name, email } = req.body;

    // Email-address-based rate limit check
    if (isEmailRateLimited(email)) {
        return res.status(429).json({ message: "Too many requests for this email address. Please try again later." });
    }

    // Sent-email rate limit check
    if (!canSendEmail()) {
        return res.status(429).json({ message: "Email sending limit reached. Please try again in a few minutes." });
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    const safeName = escapeHTML(name);
    const safeEmail = escapeHTML(email);

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,
        replyTo: safeEmail,
        to: process.env.EMAIL_USER,
        subject: "New Contact Form Submission",
        text: `Name: ${safeName}\nEmail: ${safeEmail}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #222;">
                <h2>New Contact Form Submission</h2>
                <table style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Name:</td>
                        <td style="padding: 8px;">${safeName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Email:</td>
                        <td style="padding: 8px;">${safeEmail}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; color: #888; font-size: 0.9em;">This message was sent from the TravelGo contact form.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        recordSentEmail();
        res.json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Mail error:", error);
        res.status(500).json({ message: "Error sending email" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));