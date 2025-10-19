/**
 * 갓생 제조기 - 캐릭터 경험치 및 레벨업 관리 유틸리티
 * - 1분 = 1 EXP, 100 EXP = 1 레벨 규칙 적용
 */
const pool = require('../config/db');

// 레벨업에 필요한 경험치를 계산하는 함수 (항상 100으로 고정)
const getExpRequired = (level) => {
    return 100; 
};


/**
 * 캐릭터에게 경험치를 부여하고 레벨업을 확인 및 처리합니다.
 * @param {number} userId - 경험치를 부여할 사용자 ID
 * @param {number} expAmount - 부여할 경험치 양
 * @returns {object} - 업데이트된 레벨, 경험치 및 레벨업 여부
 */
const updateExpAndCheckLevelUp = async (userId, expAmount) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. 현재 캐릭터 상태 조회 (level, exp)
        const [current] = await connection.execute(
            'SELECT level, exp FROM Characters WHERE userId = ?', 
            [userId]
        );

        if (current.length === 0) {
            await connection.rollback();
            throw new Error('Character not found'); 
        }
        
        let { level, exp } = current[0];
        let newExp = exp + expAmount;
        let levelUpOccurred = false;

        // 2. 레벨업 체크 및 처리 (다중 레벨업 가능)
        const expRequired = getExpRequired(level); // 100
        while (newExp >= expRequired) { 
            newExp -= expRequired; 
            level += 1; 
            levelUpOccurred = true;
        }

        // 3. DB 업데이트
        const sql = 'UPDATE Characters SET level = ?, exp = ? WHERE userId = ?';
        await connection.execute(sql, [level, newExp, userId]);

        await connection.commit();
        
        return {
            newLevel: level,
            newExp: newExp,
            levelUpOccurred: levelUpOccurred
        };

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('경험치 업데이트 트랜잭션 오류:', error);
        throw error; 
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = { updateExpAndCheckLevelUp }