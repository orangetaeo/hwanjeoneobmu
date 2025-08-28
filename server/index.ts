import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import apiRoutes from "./routes";
import { setupVite, serveStatic, log } from "./vite";
const apiKey = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 로깅 미들웨어 (기존과 동일)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 루트 경로 핸들러 (기존과 동일)
app.get('/', (req, res) => {
  res.send('환전업무 API 서버에 오신 것을 환영합니다.');
});

// API 라우트 (기존과 동일)
app.use('/api', apiRoutes);

// 에러 핸들러 (기존과 동일)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = (typeof err === 'object' && err !== null) ?
    (err.status || err.statusCode || 500) : 500;
  const message = (typeof err === 'object' && err !== null && typeof err.message === 'string') ?
    err.message : "Internal Server Error";

  console.error('Express error handler:', err);
  res.status(status).json({ message });

  if (process.env.NODE_ENV === 'development') {
    throw err;
  }
});

// 정적 파일 제공 로직 (기존과 동일)
// Vercel 배포 환경에서는 'else' 블록의 serveStatic(app)이 실행됩니다.
if (app.get("env") === "development") {
  // 로컬 개발 환경에서만 사용될 Vite 설정
  // 이 부분은 Vercel 배포 시에는 실행되지 않습니다.
  const { createServer } = await import("http");
  const server = createServer(app);
  await setupVite(app, server);
} else {
  serveStatic(app);
}

// ✅ [변경점] app.listen()을 삭제하고 app 객체를 export 합니다.
// Vercel이 이 app 객체를 가져가서 자체적으로 서버를 실행합니다.
export default app;