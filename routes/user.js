/*
 * 갓생 제조기 - 사용자 정보 관련 API 라우터
 */

// --- 모듈 임포트 ---
const express = require('express'); // Express 프레임워크
const pool = require('../config/db'); // 미리 설정된 DB 커넥션 풀
const authMiddleware = require('../middleware/auth'); // JWT 인증 미들웨어

// --- 라우터 초기화 ---
const router = express.Router(); // Express의 라우터 기능 사용

// ----------------------------------------------------------------
// [GET] /api/user/me : 현재 로그인한 사용자의 정보를 조회하는 API
// ----------------------------------------------------------------
// authMiddleware: 이 API에 접근하기 전, '보안 요원'이 먼저 토큰을 검사함
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // 1. 사용자 ID 추출
    // authMiddleware가 토큰 검증 후, req.user 객체에 해독된 사용자 정보를 넣어줌
    const userId = req.user.id; 

    // 2. 데이터베이스 쿼리 준비
    // 보안을 위해 비밀번호(password_hash)는 절대 조회하지 않음
    const sql = 'SELECT id, email, nickname, createdAt FROM Users WHERE id = ?';
    
    // 3. 데이터베이스에 쿼리 실행
    // pool.execute를 사용해 안전하게 SQL 인젝션 공격 방어
    const [rows] = await pool.execute(sql, [userId]);

    // 4. 사용자 존재 여부 확인
    // DB에서 해당 ID의 사용자를 찾지 못한 경우
    if (rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 5. 성공 응답 전송
    // 조회된 사용자 정보(rows의 첫 번째 요소)를 프론트엔드에 JSON 형태로 전송
    res.status(200).json(rows[0]);

  } catch (error) {
    // 6. 서버 오류 처리
    // DB 연결 실패 등 예상치 못한 오류 발생 시
    console.error('내 정보 조회 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// (향후 닉네임 변경, 비밀번호 변경 API 등을 이 파일에 추가)


// --- 라우터 내보내기 ---
// app.js에서 이 라우터 설정을 사용할 수 있도록 모듈로 내보냄
module.exports = router;

