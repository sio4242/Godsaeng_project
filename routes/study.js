/**
 * 갓생 제조기 - 순공시간 (Study Log) 관리 API 라우터
 * - 스톱워치 시작 및 종료, 학습 기록 조회 담당
 */
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { updateExpAndCheckLevelUp } = require('../utils/characterUtils');
const router = express.Router();

// ----------------------------------------------------------------
// [POST] /api/study/start : 순공시간 측정 시작
// ----------------------------------------------------------------
router.post('/start', authMiddleware, async (req, res) => {
    // 1. JWT 인증 미들웨어를 통해 사용자 ID 획득
    const userId = req.user.id;

    try {
        // 2. StudyLogs 테이블에 새로운 세션 시작 시간 기록
        // endTime과 duration은 NULL 상태로 시작
        const sql = 'INSERT INTO StudyLogs (userId, startTime) VALUES (?, NOW())';
        const [result] = await pool.execute(sql, [userId]); 
        
        const logId = result.insertId;

        // 3. 프론트엔드에 생성된 로그 ID를 반환. 
        //    프론트엔드는 이 ID를 스톱워치 종료 시 다시 서버로 보내야 함.
        res.status(201).json({ 
            logId: logId,
            message: '순공시간 측정을 시작했습니다.' 
        });

    } catch (error) {
        console.error('순공시간 시작 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// ----------------------------------------------------------------
// [PUT] /api/study/stop/:logId : 순공시간 측정 종료 및 기록 업데이트
// ----------------------------------------------------------------
router.put('/stop/:logId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const logId = req.params.logId; // URL 경로에서 로그 ID를 받음

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // 트랜잭션 시작 (원자성 보장)

        // 1. 해당 로그 ID의 시작 시간(startTime)을 조회 (현재 사용자가 소유하고, 아직 종료되지 않은 세션만)
        const [logs] = await connection.execute(
            'SELECT startTime FROM StudyLogs WHERE id = ? AND userId = ? AND endTime IS NULL',
            [logId, userId]
        );

        if (logs.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '진행 중인 학습 기록을 찾을 수 없거나 권한이 없습니다.' });
        }
        
        const startTime = new Date(logs[0].startTime);
        const endTime = new Date();
        
        // 2. 경과 시간 계산 (밀리초(ms) 단위로 계산 후 초 단위로 변환)
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        // 3. 5초 미만의 짧은 시간은 무시 (노이즈 필터링)
        if (durationSeconds < 5) {
            await connection.rollback(); 
            return res.status(200).json({ 
                message: '너무 짧은 시간(5초 미만)은 기록되지 않습니다.', 
                durationSeconds: 0 
            });
        }

        // 4. StudyLogs 업데이트 (종료 시간과 기간 기록)
        const [updateResult] = await connection.execute(
            'UPDATE StudyLogs SET endTime = NOW(), duration = ? WHERE id = ? AND userId = ?',
            [durationSeconds, logId, userId]
        );

        // 5. ⭐️ 핵심 갓생 로직: 경험치 (XP) 지급 및 레벨업 체크
        let levelUpInfo = null;
        const studyMinutes = Math.floor(durationSeconds / 60);
        if (studyMinutes > 0) {
             const expAmount = studyMinutes * 1; // 1분당 1 경험치 지급 (예시)
             // ⭐️ 3. 경험치 업데이트 함수 호출 (connection 전달 필요, 함수 수정 필요)
             levelUpInfo = await updateExpAndCheckLevelUp(userId, expAmount, connection); // connection 전달하도록 함수 수정 필요
        }

        await connection.commit(); // 트랜잭션 성공적으로 완료
        
        res.status(200).json({ 
            message: '순공시간 측정을 종료하고 기록했습니다.',
            durationSeconds: durationSeconds,
            durationMinutes: (durationSeconds / 60).toFixed(2) // 분 단위도 함께 제공
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // 오류 발생 시 롤백
        }
        console.error('순공시간 종료 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


module.exports = router;