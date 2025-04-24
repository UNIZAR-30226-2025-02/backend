import nodemailer from 'nodemailer';
import { html_correo, html_cambio_contrasena } from './htmlEnviables.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = async (email, token) => {
    const direccion = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net/verificar';

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


export const sendChangePasswdEmail = async (email, token) => {
    const codigo = `${token}`;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Solicitud de cambio de contraseña',
        html: html_cambio_contrasena(codigo)
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo de verificación enviado');
    } catch (error) {
        console.error('Error enviando el correo:', error);
    }
};