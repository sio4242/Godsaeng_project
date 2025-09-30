/**
 * 갓생 제조기 - 사용자 정보 관련 API 라우터
 * 사용자 프로필 조회, 닉네임 변경, 비밀번호 변경 등 담당
 */
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ----------------------------------------------------------------
// [GET] /api/user/me : 현재 로그인한 사용자의 프로필 정보를 조회
// ----------------------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Users 테이블과 Characters 테이블을 JOIN하여 필요한 정보를 한 번에 가져옴
    const sql = `
      SELECT 
        u.id, 
        u.email, 
        u.nickname, 
        u.createdAt,
        c.level,
        c.exp
      FROM Users u
      LEFT JOIN Characters c ON u.id = c.userId
      WHERE u.id = ?
    `;
    
    const [rows] = await pool.execute(sql, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }

    res.status(200).json(rows[0]);

  } catch (error) {
    console.error('내 정보 조회 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ----------------------------------------------------------------
// [PUT] /api/user/nickname : 닉네임 변경 API
// ----------------------------------------------------------------
router.put('/nickname', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { newNickname } = req.body;

        // 1. 새 닉네임 유효성 검사
        if (!newNickname || newNickname.length < 2 || newNickname.length > 10) {
            return res.status(400).json({ message: '닉네임은 2~10자 사이여야 합니다.' });
        }

        // 2. DB 업데이트
        const sql = 'UPDATE Users SET nickname = ? WHERE id = ?';
        await pool.execute(sql, [newNickname, userId]);

        res.status(200).json({ message: '닉네임이 성공적으로 변경되었습니다.' });

    } catch (error) {
        console.error('닉네임 변경 API 오류:', error);
        // 닉네임 중복 오류 처리
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
        }
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// ----------------------------------------------------------------
// [PUT] /api/user/password : 비밀번호 변경 API
// ----------------------------------------------------------------
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // 1. 입력값 확인
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
        }

        // 2. 새 비밀번호 유효성 검사
        if (newPassword.length < 6 || newPassword.length > 12) {
            return res.status(400).json({ message: '새 비밀번호는 6~12자 사이여야 합니다.' });
        }

        // 3. 현재 비밀번호 검증
        const userSql = 'SELECT password_hash FROM Users WHERE id = ?';
        const [rows] = await pool.execute(userSql, [userId]);
        const user = rows[0];

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
        }

        // 4. 새 비밀번호 암호화 및 DB 업데이트
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updateSql = 'UPDATE Users SET password_hash = ? WHERE id = ?';
        await pool.execute(updateSql, [hashedNewPassword, userId]);

        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });

    } catch (error) {
        console.error('비밀번호 변경 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;