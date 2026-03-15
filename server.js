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

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: "Too many requests from this IP, please try again later."
});
app.use('/send', limiter);

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
        res.json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Mail error:", error);
        res.status(500).json({ message: "Error sending email" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));