-- 'godsaeng_db' 라는 이름의 데이터베이스(저장 공간)를 생성합니다.
CREATE DATABASE godsaeng_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE godsaeng_db;
-- 사용자 정보를 저장할 'Users' 테이블을 생성합니다.
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- id: 각 사용자를 구분하는 고유 번호 (자동으로 1씩 증가하며 채워짐)

    email VARCHAR(255) NOT NULL UNIQUE,users
    -- email: 로그인 사용할 이메일 (최대 255자, 비어있을 수 없고, 중복될 수 없음)

    password VARCHAR(255) NOT NULL,
    -- password: 비밀번호 (암호화될 것을 대비해 길게 설정)

    nickname VARCHAR(10) NOT NULL UNIQUE,
    -- nickname: 앱에서 보여줄 별명 (최대 50자, 중복 불가)

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- createdAt: 가입한 날짜와 시간 (데이터가 만들어질 때 자동으로 기록됨)
);
ALTER TABLE Users MODIFY nickname VARCHAR(10) NOT NULL UNIQUE;
-- 별명을 최대 10글자로 제한

ALTER TABLE Users CHANGE password password_hash VARCHAR(255) NOT NULL;
-- password 에서 password_hash로 이름 변경users
