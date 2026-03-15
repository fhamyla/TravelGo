// netlify/functions/send.js
// Copyright (c) 2024 fhamyla
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
const nodemailer = require('nodemailer');

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
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    const { name, email } = JSON.parse(event.body);

    if (!name || !email) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'All fields are required!' })
        };
    }

    if (!validateEmail(email)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid email address!' })
        };
    }

    const safeName = sanitize(name);
    const safeEmail = sanitize(email);

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,   // safer than using user email
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

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email sent successfully!' })
        };

    } catch (error) {

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error sending email',
                error: error.toString()
            })
        };
    }
};