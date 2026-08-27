import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./App.js";

dotenv.config({
    path: "./.env"
});



connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`App is listening on port ${process.env.PORT}`);
    }); 
})
.catch((err) => {
    console.log("mongo db connection failed ", err);
})






