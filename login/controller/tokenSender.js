import nodemailer from 'nodemailer';
import { html_correo } from './httpsEnviables.js';
import Console from 'console';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = async (email, token) => {
    const direccion = 'http://localhost:3000/verificar';
    const verificationLink = `${direccion}?token=${token}`;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verifica tu correo electrónico',
        html: html_correo(verificationLink)
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo de verificación enviado');
    } catch (error) {
        console.error('Error enviando el correo:', error);
    }
};
