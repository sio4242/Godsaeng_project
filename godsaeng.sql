-- 'godsaeng_db' 라는 이름의 데이터베이스(저장 공간)를 생성
CREATE DATABASE IF NOT EXISTS godsaeng_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 생성한 데이터베이스를 사용하겠다고 지정
USE godsaeng_db;

-- Users 테이블: 사용자 정보를 저장
CREATE TABLE Users (
    -- id: 각 사용자를 구분하는 고유 번호 (자동으로 1씩 증가하며 채워짐)
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- email: 로그인 시 사용할 이메일 (최대 255자, 중복 불가)
    email VARCHAR(255) NOT NULL UNIQUE,

    -- password_hash: 암호화된 비밀번호 저장 (password 에서 이름 변경)
    password_hash VARCHAR(255) NOT NULL,

    -- nickname: 앱에서 보여줄 별명 (최대 10자, 중복 불가)
    nickname VARCHAR(10) NOT NULL UNIQUE,

    -- createdAt: 가입한 날짜와 시간 (데이터가 만들어질 때 자동으로 기록됨)
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 비밀번호 재설정을 위한 임시 토큰과 유효기간
    resetPasswordToken VARCHAR(255),
    resetPasswordExpires TIMESTAMP
);


-- Characters 테이블: 사용자별 캐릭터 정보를 저장 (Users와 1:1 관계)
CREATE TABLE Characters (
    -- 각 캐릭터를 구분하기 위한 고유 번호
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- 어떤 사용자의 캐릭터인지 Users 테이블과 연결 (한 명당 하나의 캐릭터만 가짐 - UNIQUE)
    userId INT NOT NULL UNIQUE,

    -- 캐릭터의 현재 레벨 (기본값 1)
    level INT DEFAULT 1,

    -- 캐릭터의 현재 경험치 (기본값 0)
    exp INT DEFAULT 0,

    -- Users 테이블의 id를 참조하는 외래 키(Foreign Key) 설정
    -- 사용자가 탈퇴하면, 캐릭터 정보도 함께 삭제됨 (ON DELETE CASCADE)
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);


-- StudyLogs 테이블: 순공 시간 타이머 기록을 저장 (Users와 1:N 관계)
CREATE TABLE StudyLogs (
    -- 각 기록을 구분하기 위한 고유 번호
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 어떤 사용자의 기록인지 Users 테이블과 연결
    userId INT NOT NULL,
    
    -- 스톱워치로 측정한 공부 시간 (분 단위)
    durationInMinutes INT NOT NULL,
    
    -- 이 기록이 생성된 날짜와 시간
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	
	-- Users 테이블의 id를 참조하는 외래 키(Foreign Key) 설정
    -- 사용자가 탈퇴하면, 학습 기록도 함께 삭제됨
	FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 3.4. Todos 테이블: 사용자의 할 일(To-Do)을 저장합니다. (Users와 1:N 관계)
CREATE TABLE Todos (
    -- id: 각 할 일을 구분하기 위한 고유 번호
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- userId: 이 할 일을 작성한 사용자의 ID
    userId INT NOT NULL,
    -- title: 할 일의 내용
    title VARCHAR(255) NOT NULL,
    -- isCompleted: 할 일의 완료 여부 (true/false)
    isCompleted BOOLEAN DEFAULT false,
    -- dueDate: 할 일의 마감 날짜
    dueDate DATE,
    -- createdAt: 할 일이 생성된 날짜와 시간
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEY: Users 테이블과 연결하여 데이터의 일관성을 보장
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);


-- 3.5. WordSets 테이블: 사용자가 생성한 단어장을 저장합니다. (Users와 1:N 관계)
CREATE TABLE WordSets (
    -- id: 각 단어장을 구분하기 위한 고유 번호
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- userId: 이 단어장을 생성한 사용자의 ID
    userId INT NOT NULL,
    -- setTitle: 단어장의 제목
    setTitle VARCHAR(100) NOT NULL,
    -- createdAt: 단어장이 생성된 날짜와 시간
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEY: Users 테이블과 연결
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);


-- 3.6. Words 테이블: 각 단어장에 포함된 개별 단어를 저장합니다. (WordSets와 1:N 관계)
CREATE TABLE Words (
    -- id: 각 단어를 구분하기 위한 고유 번호
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- wordSetId: 이 단어가 속한 단어장의 ID
    wordSetId INT NOT NULL,
    -- question: 문제 (단어의 뜻 등)
    question VARCHAR(255) NOT NULL,
    -- answer: 정답 (단어)
    answer VARCHAR(255) NOT NULL,
    -- FOREIGN KEY: WordSets 테이블과 연결
    FOREIGN KEY (wordSetId) REFERENCES WordSets(id) ON DELETE CASCADE
);