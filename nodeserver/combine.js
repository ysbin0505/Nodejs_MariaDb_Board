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

  app.get('/index.html', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', function (err, data) {
      if (err) {
        res.status(500).send('Internal Server Error');
        return;
      }
      res.send(data);
    });
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

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.send(data);
  });
});

app.get('/write.html', (req, res) => {
  const filePath = path.join(__dirname, 'write.html');
  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.send(data);
  });
});

server.listen(serverPort, () => {
  console.log('Server 작동 중...');
});
