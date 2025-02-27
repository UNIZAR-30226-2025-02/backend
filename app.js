import express from 'express';
import cors from 'cors';

export const app = express()

app.set('port', process.env.PORT || 3000)
app.set('trust proxy', true)

app.use(cors())