const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

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
            user: "fhamyla.devera@gmail.com",
            pass: "baou qhdq blbq nhpx",
        },
    });

    let mailOptions = {
        from: email,
        to: "fhamyla.devera@gmail.com",
        subject: "New Contact Form Submission",
        text: `Name: ${name}\nEmail: ${email}`,
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