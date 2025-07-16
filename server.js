// server.js
// Copyright (c) 2024 fhamyla
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

app.post("/send", async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let mailOptions = {
        from: email,
        to: "fhamyla.devera@gmail.com",
        subject: "New Contact Form Submission",
        text: `Name: ${name}\nEmail: ${email}`,
        html: `
            <div style=\"font-family: Arial, sans-serif; color: #222;\">
                <h2>New Contact Form Submission</h2>
                <table style=\"border-collapse: collapse;\">
                    <tr>
                        <td style=\"padding: 8px; font-weight: bold;\">Name:</td>
                        <td style=\"padding: 8px;\">${name}</td>
                    </tr>
                    <tr>
                        <td style=\"padding: 8px; font-weight: bold;\">Email:</td>
                        <td style=\"padding: 8px;\">${email}</td>
                    </tr>
                </table>
                <p style=\"margin-top: 20px; color: #888; font-size: 0.9em;\">This message was sent from the TravelGo contact form.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: "Email sent successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error sending email", error });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));