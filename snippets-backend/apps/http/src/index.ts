import express from 'express';
import { router } from "./routes/v1";

import dotenv from 'dotenv';
dotenv.config();

const cors = require('cors');
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

app.use("/api/v1", router);

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on http://localhost:3000");
});
