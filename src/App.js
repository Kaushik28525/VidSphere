import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

//routes import 
import userRoutes from './routes/user.routes.js';
import healthcheckRoutes from "./routes/healthcheck.routes.js";


//routes deceleration 
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/healthcheck", healthcheckRoutes);


 export { app };