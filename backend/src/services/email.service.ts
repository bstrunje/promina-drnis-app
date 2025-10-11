import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV === 'development';

interface EmailParams {
    to: string;
    full_name: string;
    password: string;
    firstName: string;
    lastName: string;
}

// Generički email za slanje 2FA koda
export const sendTwoFactorCodeEmail = async (to: string, code: string, expiresSeconds: number): Promise<void> => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        if (isDev) console.log('[2FA][EMAIL] SMTP nije konfiguriran. Preskačem slanje emaila.', { to, code });
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const html = `
        <h2>Two-Factor Authentication</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</div>
        <p>This code expires in ${Math.ceil(expiresSeconds/60)} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
    `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Your 2FA verification code',
        html
    });
}

export const sendPasswordEmail = async ({ to, full_name, password, firstName, lastName }: EmailParams): Promise<void> => {
    // Ako SMTP podaci nisu postavljeni, nemoj slati email i samo zabilježi u log
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        if (isDev) console.log('SMTP varijable nisu postavljene. Preskačem slanje emaila.');
        return;
    }

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
            <li>Username: ${full_name}</li>
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