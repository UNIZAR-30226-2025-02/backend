export const httpRespuestaWebPositiva = `
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación Completa</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f9;
                color: #333;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                text-align: center;
            }

            .container {
                padding: 20px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 100%;
            }

            h1 {
                color: #4CAF50;
            }

            pre {
                font-size: 14px;
                color: #333;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            p {
                font-size: 18px;
            }

            .btn {
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }

            .btn:hover {
                background-color: #45a049;
            }
        </style>
    </head>
    <body>

        <div class="container">
            <h1>¡Verificación Completa!</h1>
            <p>Tu correo ha sido verificado con éxito. Ya puedes cerrar esta pestaña.</p>
            
            <button class="btn" onclick="window.close();">Cerrar pestaña</button>
        </div>

    </body>
    </html>

    `;


export const html_correo = (verificationLink) => {
    return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifica tu correo</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                }
                h1 {
                    color: #333;
                }
                p {
                    color: #555;
                    font-size: 16px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 20px;
                    margin-top: 20px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    font-size: 18px;
                    border-radius: 5px;
                }
                .footer {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Verificación de Correo Electrónico</h1>
                <p>Hola,</p>
                <p>Gracias por registrarte CheckMateX. Para completar tu registro, por favor haz clic en el botón de abajo para verificar tu dirección de correo electrónico.</p>
                <a href="${verificationLink}" class="button">Verificar Correo</a>
                <p>Si no solicitaste este correo, puedes ignorarlo con seguridad.</p>
                <p class="footer">© 2025 RookieGames. Todos los derechos reservados.</p>
            </div>
        </body>
        </html>`;
};