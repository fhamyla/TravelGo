// netlify/functions/send.js
// Copyright (c) 2024 fhamyla
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
const nodemailer = require('nodemailer');

// --- Rate Limiting ---

// 1. IP-based rate limiter
const ipRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = ipRateLimits.get(ip) || { count: 0, firstRequestAt: now };

    if (now - entry.firstRequestAt > RATE_LIMIT_WINDOW_MS) {
        entry.count = 1;
        entry.firstRequestAt = now;
    } else {
        entry.count += 1;
    }

    ipRateLimits.set(ip, entry);
    return entry.count > MAX_REQUESTS_PER_WINDOW;
}

// 2. Email-address-based rate limiter
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

// 3. Sent-email rate limiter (global)
//    Caps the total number of emails actually sent to 3 per 5 minutes.
const sentEmailTimestamps = [];
const SENT_EMAIL_WINDOW_MS = 5 * 60 * 1000;
const SENT_EMAIL_MAX_PER_WINDOW = 3;

function canSendEmail() {
    const now = Date.now();
    while (sentEmailTimestamps.length > 0 && now - sentEmailTimestamps[0] > SENT_EMAIL_WINDOW_MS) {
        sentEmailTimestamps.shift();
    }
    return sentEmailTimestamps.length < SENT_EMAIL_MAX_PER_WINDOW;
}

function recordSentEmail() {
    sentEmailTimestamps.push(Date.now());
}

function sanitize(input) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Method Not Allowed" })
        };
    }

    const ip =
        event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        event.headers['x-real-ip'] ||
        event.requestContext?.identity?.sourceIp ||
        '127.0.0.1';

    if (isRateLimited(ip)) {
        return {
            statusCode: 429,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Too many requests. Please wait 5 minutes before trying again." })
        };
    }

    let parsed;
    try {
        parsed = JSON.parse(event.body);
    } catch {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Invalid request body." })
        };
    }

    const { name, email, website } = parsed;

    if (website) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Bot detected" })
        };
    }

    if (!name || !email) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'All fields are required!' })
        };
    }

    if (String(name).length > 100) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Name must be less than 100 characters." })
        };
    }

    if (!validateEmail(email)) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Invalid email address!" })
        };
    }

    // Email-address-based rate limit check
    if (isEmailRateLimited(email)) {
        return {
            statusCode: 429,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Too many requests for this email address. Please try again later." })
        };
    }

    // Sent-email rate limit check
    if (!canSendEmail()) {
        return {
            statusCode: 429,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Email sending limit reached. Please try again in a few minutes." })
        };
    }

    const safeName = sanitize(name);
    const safeEmail = sanitize(email);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        replyTo: safeEmail,
        to: process.env.EMAIL_USER,
        subject: 'New Contact Form Submission',
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
                <p style="margin-top: 20px; color: #888; font-size: 0.9em;">
                    This message was sent from the TravelGo contact form.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        recordSentEmail();
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Email sent successfully!" })
        };
    } catch (error) {
        console.error("Mail error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Error sending email" })
        };
    }
};