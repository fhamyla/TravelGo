const nodemailer = require('nodemailer');

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

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let mailOptions = {
        from: email,
        to: process.env.EMAIL_USER,
        subject: 'New Contact Form Submission',
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
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email sent successfully!' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error sending email', error: error.toString() })
        };
    }
}; 