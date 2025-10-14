/**
 * 갓생 제조기 - 할 일(Todo) 관리 API 라우터 (CRUD 전체)
 */
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ----------------------------------------------------------------
// [POST] /api/todos : 새로운 할 일을 생성
// ----------------------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { title, dueDate } = req.body;

    try {
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ message: '할 일 내용을 입력해주세요.' });
        }
        
        //dueDate가 빈 문자열일 경우 NULL로 처리
        const finalDueDate = dueDate || null;

        const sql = 'INSERT INTO Todos (userId, title, dueDate, isCompleted) VALUES (?, ?, ?, ?)';
        const [result] = await pool.execute(sql, [userId, title, finalDueDate, false]); 

        res.status(201).json({ 
            id: result.insertId,
            title,
            dueDate: finalDueDate,
            isCompleted: false,
            message: '할 일이 성공적으로 생성되었습니다.' 
        });

    } catch (error) {
        console.error('할 일 생성 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// ----------------------------------------------------------------
// [GET] /api/todos : 사용자의 모든 할 일 목록 또는 특정 날짜의 할 일 조회
// ----------------------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { date, includeCompleted } = req.query; 

    try {
        let sql = 'SELECT id, title, isCompleted, dueDate, createdAt, updatedAt FROM Todos WHERE userId = ?';
        let params = [userId];

        // 1. 특정 날짜(캘린더) 필터링
        if (date) {
            sql += ' AND DATE(dueDate) = ?';
            params.push(date);
        }
        
        // 2. 완료 여부 필터링 (쿼리 파라미터가 없거나 'true'가 아니면 미완료만 조회)
        if (includeCompleted !== 'true') {
             sql += ' AND isCompleted = FALSE';
        }


        sql += ' ORDER BY dueDate ASC, createdAt DESC';

        const [todos] = await pool.execute(sql, params);

        res.status(200).json(todos);

    } catch (error) {
        console.error('할 일 조회 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// ----------------------------------------------------------------
// [PUT] /api/todos/:id : 할 일 내용(제목, 마감일) 수정
// ----------------------------------------------------------------
router.put('/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const todoId = req.params.id;
    const { title, dueDate } = req.body;
    
    // 최소한 하나 이상의 수정할 필드가 있는지 확인
    if (!title && !dueDate) {
        return res.status(400).json({ message: '수정할 내용을 입력해주세요.' });
    }

    try {
        let updateFields = [];
        let params = [];

        if (title) {
            if (title.trim().length === 0) {
                 return res.status(400).json({ message: '할 일 내용은 비워둘 수 없습니다.' });
            }
            updateFields.push('title = ?');
            params.push(title);
        }
        
        // dueDate가 명시되면 수정, 없으면 null로 수정 허용
        if (dueDate !== undefined) {
             updateFields.push('dueDate = ?');
             params.push(dueDate || null);
        }


        const sql = `UPDATE Todos SET ${updateFields.join(', ')} WHERE id = ? AND userId = ?`;
        params.push(todoId, userId);

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            // 해당 ID의 할 일이 없거나, 해당 사용자의 할 일이 아닌 경우
            return res.status(404).json({ message: '할 일을 찾을 수 없거나 수정 권한이 없습니다.' });
        }

        res.status(200).json({ message: '할 일이 성공적으로 수정되었습니다.' });

    } catch (error) {
        console.error('할 일 수정 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// ----------------------------------------------------------------
// [PUT] /api/todos/:id/toggle : 할 일 완료 상태 토글 (핵심 갓생 로직)
// ----------------------------------------------------------------
router.put('/:id/toggle', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const todoId = req.params.id;
    const { isCompleted } = req.body; // true 또는 false

    if (typeof isCompleted !== 'boolean') {
        return res.status(400).json({ message: 'isCompleted 값은 true 또는 false여야 합니다.' });
    }
    
    // **트랜잭션**을 사용하여 Todo 업데이트와 경험치/레벨 로직을 묶는 것이 안전함.
    // 하지만 여기서는 단순 업데이트만 구현하고 경험치 로직은 분리 (다음 단계 제안).
    
    try {
        const sql = 'UPDATE Todos SET isCompleted = ? WHERE id = ? AND userId = ?';
        const [result] = await pool.execute(sql, [isCompleted, todoId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '할 일을 찾을 수 없거나 권한이 없습니다.' });
        }
        
        // TODO: isCompleted가 true로 바뀌는 순간 (성공) 캐릭터에게 경험치를 지급하는 로직 추가 필요!

        res.status(200).json({ 
            message: `할 일이 ${isCompleted ? '완료' : '미완료'} 처리되었습니다.`,
            isCompleted: isCompleted 
        });

    } catch (error) {
        console.error('할 일 토글 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// ----------------------------------------------------------------
// [DELETE] /api/todos/:id : 할 일 삭제
// ----------------------------------------------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const todoId = req.params.id;

    try {
        const sql = 'DELETE FROM Todos WHERE id = ? AND userId = ?';
        const [result] = await pool.execute(sql, [todoId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '할 일을 찾을 수 없거나 삭제 권한이 없습니다.' });
        }

        res.status(200).json({ message: '할 일이 성공적으로 삭제되었습니다.' });

    } catch (error) {
        console.error('할 일 삭제 API 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;