import nodemailer from 'nodemailer';

interface EmailParams {
    to: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
}

export async function sendPasswordEmail({ to, username, password, firstName, lastName }: EmailParams): Promise<void> {
    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Email template
    const html = `
        <h2>Hello ${firstName} ${lastName},</h2>
        <p>Your account password has been set/updated.</p>
        <p>Your login credentials are:</p>
        <ul>
            <li>Username: ${username}</li>
            <li>Password: ${password}</li>
        </ul>
        <p>Please login using these credentials and change your password after first login.</p>
        <p>Best regards,<br>Your Admin Team</p>
    `;

    // Send email
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Your Account Password',
        html
    });
}