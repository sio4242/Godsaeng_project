/**
 * 갓생 제조기 - 순공시간 (Study Log) 관리 API 라우터
 * - 스톱워치 종료 시 1분 = 1 EXP 로직
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
    const userId = req.user.id;

    try {
        const sql = 'INSERT INTO StudyLogs (userId, startTime) VALUES (?, NOW())';
        const [result] = await pool.execute(sql, [userId]); 
        
        res.status(201).json({ 
            logId: result.insertId,
            message: '공부 시작!' 
        });

    } catch (error) {
        console.error('순공시간 시작 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생' });
    }
});

// ----------------------------------------------------------------
// [PUT] /api/study/stop/:logId : 순공시간 측정 종료 및 기록 업데이트
// ----------------------------------------------------------------
router.put('/stop/:logId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const logId = req.params.logId;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); 

        // 1. 해당 로그 ID의 시작 시간(startTime) 조회 및 유효성 검사
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
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        // 1분 미만의 짧은 시간은 무시
        if (durationMinutes < 1) {
            await connection.rollback(); 
            return res.status(200).json({ 
                message: '1분 미만은 기록되지 않습니다. (0 EXP)', 
                durationSeconds: 0,
                expGained: 0
            });
        }

        // 2. StudyLogs 업데이트 (종료 시간과 기간 기록)
        await connection.execute(
            'UPDATE StudyLogs SET endTime = NOW(), duration = ? WHERE id = ? AND userId = ?',
            [durationSeconds, logId, userId]
        );
        
        // 3. 핵심 갓생 로직: 경험치 (XP) 계산
        // 1분(60초)당 1 EXP 지급 규칙 적용
        const expAmount = Math.floor(durationSeconds / 60); 

        // StudyLogs 트랜잭션 커밋
        await connection.commit(); 
        connection.release();

        // 4. 경험치 부여 및 레벨업 체크 (별도 트랜잭션)
        const expResult = await updateExpAndCheckLevelUp(userId, expAmount);
        
        res.status(200).json({ 
            message: '공부를 종료했습니다!',
            durationSeconds: durationSeconds,
            durationMinutes: (durationSeconds / 60).toFixed(2),
            expGained: expAmount, 
            newLevel: expResult.newLevel,
            newExp: expResult.newExp,
            levelUpMessage: expResult.levelUpOccurred ? '축하합니다! 레벨업 했습니다!' : undefined
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); 
            connection.release();
        }
        console.error('순공시간 종료 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        if (connection) {
            
        }
    }
});


module.exports = router;