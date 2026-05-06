import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { apiRouter } from "./routes/api.js";
import { isApiError } from "./errors.js";

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ?? true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRouter);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (isApiError(error)) {
    response.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Серверийн алдаа гарлаа." });
});
