/**
 * 갓생 제조기 - 메인 서버 파일
 * - 이 파일은 전체 백엔드 서버의 시작점입니다.
 * - 필요한 미들웨어를 설정하고, 기능별로 분리된 API 라우터를 연결합니다.
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth'); // 인증 라우터 가져오기

// Express 앱 생성 및 기본 설정
const app = express();
app.use(cors());
app.use(express.json());

// API 라우터 연결
// '/api/auth'로 시작하는 모든 요청은 authRoutes가 처리하도록 설정
app.use('/api/auth', authRoutes);

// 서버 실행
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
