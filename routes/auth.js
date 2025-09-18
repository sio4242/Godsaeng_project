/**
 * 갓생 제조기 - 인증(Authentication) API 라우터 (개선 버전)
 * - 회원가입, 로그인 등 사용자 인증 관련 API
 */
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();
// .env 파일에 SECRET이 없더라도 서버가 멈추지 않도록 기본값을 설정합니다.
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-for-development';

// 입력값 검증을 위한 함수
function validateSignupInput(email, password, nickname) {
  if (!email || !password || !nickname) {
    return '모든 필드를 입력해주세요.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '올바른 이메일 형식이 아닙니다.';
  }
  if (password.length < 6) {
    return '비밀번호는 최소 6자리 이상이어야 합니다.';
  }
  if (nickname.length < 2 || nickname.length > 10) {
    return '닉네임은 2~10자 사이여야 합니다.';
  }
  return null; // 오류가 없으면 null 반환
}

// [POST] /api/auth/signup : 회원가입 API
router.post('/signup', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    // 1. 입력값 검증
    const validationError = validateSignupInput(email, password, nickname);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // 2. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. DB 저장
    const sql = 'INSERT INTO Users (email, password_hash, nickname) VALUES (?, ?, ?)';
    await pool.execute(sql, [email, hashedPassword, nickname]);

    res.status(201).json({ message: '회원가입 성공!' });
  } catch (error) {
    console.error('회원가입 API 오류:', error);

    // 4. 중복 에러 처리
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 사용 중인 이메일 또는 닉네임입니다.' });
    }

    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [POST] /api/auth/login : 로그인 API
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 필드 확인
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 2. 사용자 조회
    const sql = 'SELECT * FROM Users WHERE email = ?';
    const [rows] = await pool.execute(sql, [email]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
    }

    // 3. 비밀번호 대조 (컬럼명을 password_hash로 변경)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
    }

    // 4. JWT 발급 (2시간 유효)
    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 5. 응답 (비밀번호 제외한 사용자 정보 포함)
    res.status(200).json({
      message: '로그인 성공!',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('로그인 API 오류:', error);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;

