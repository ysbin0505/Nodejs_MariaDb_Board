const path = require('path');
const http = require('http');
const fs = require('fs');
const mariadb = require('mariadb');
const express = require('express');

const app = express();
const server = http.createServer(app);

const DBHost = '127.0.0.1';
const DBPort = '3306';
const DBUser = 'root';
const DBPass = 'qls515';
const connectionLimit = 5;

const pool = mariadb.createPool({
  host: DBHost,
  port: DBPort,
  user: DBUser,
  password: DBPass,
  connectionLimit: connectionLimit
});

// body-parser 미들웨어 사용
app.use(express.urlencoded({ extended: true }));

app.post('/add', async (req, res) => {
  const title = req.body.title;
  const content = req.body.content;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    await conn.query('INSERT INTO tbl_board (title, content) VALUES (?, ?)', [title, content]);
    res.send('글 작성이 완료되었습니다.');
  } catch (err) {
    res.status(500).send('글 작성 중 오류가 발생했습니다.');
  } finally {
    if (conn) conn.end();
  }
});

pool.getConnection()
  .then(conn => {
    console.log('데이터베이스 연결 성공');
    conn.release();
  })
  .catch(err => {
    console.error('데이터베이스 연결 오류:', err);
  });

const serverPort = process.env.PORT || 3000;

server.on('request', (request, response) => {
  let filePath;

  if (request.url === '/write.html') {
    filePath = path.join(__dirname, 'write.html');
  } else {
    filePath = path.join(__dirname, 'index.html');
  }

  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      response.writeHead(500, { 'Content-Type': 'text/plain' });
      response.end('Internal Server Error');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(data);
  });
});

server.listen(serverPort, () => {
  console.log('Server 작동 중...');
});
