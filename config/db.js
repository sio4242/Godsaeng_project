/**
 * 갓생 제조기 - 데이터베이스 연결 설정
 * - 이 파일은 MySQL 데이터베이스와의 연결을 설정하고,
 * 다른 파일에서 쉽게 사용할 수 있도록 커넥션 풀(pool)을 내보냅니다.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

// DB 담당자에게 받은 접속 정보를 바탕으로 설정 객체를 만듭니다.
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// DB 커넥션 풀 생성 (성능 향상을 위해)
const pool = mysql.createPool(dbConfig);

// 다른 파일에서 이 pool을 가져다 쓸 수 있도록 내보냅니다.
module.exports = pool;
