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

// body-parser middleware
app.use(express.urlencoded({ extended: true }));

app.post('/add', async (req, res) => {
  // 게시물 정보 가져오기
  const title = req.body.title;
  const content = req.body.content;
  const writer = req.body.writer;

  let conn;
  try { //작성한 내용 db로 삽입
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    await conn.query('INSERT INTO tbl_board (title, content, writer) VALUES (?, ?, ?)', [title, content, writer]);
    res.redirect('/index.html'); // index.html로 리디렉션
  } catch (err) {
    res.status(500).send('글 작성 중 오류가 발생했습니다.');
  } finally {
    if (conn) conn.end();
  }
});

app.get('/', (req, res) => {
  res.redirect('/index.html'); // index.html로 리디렉션
});

app.get('/index.html', async (req, res) => {  //db내용 index.html로 삽입
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    const results = await conn.query('SELECT num, title, writer, date FROM tbl_board');
    const html = renderIndexPage(results);
    res.send(html);
  } catch (err) {
    res.status(500).send('내부 서버 오류');
  } finally {
    if (conn) conn.end();
  }
});

function renderIndexPage(posts) {   //index.html
  let tableRows = '';
  posts.forEach(post => {
    tableRows += `
      <tr>
        <td>${post.num}</td>
        <td><a href="/posts/${post.num}">${post.title}</a></td>
        <td>${post.writer}</td>
        <td>${post.date}</td>
      </tr>
    `;
  });

  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  return html.replace('<!-- 동적으로 생성된 테이블 행 -->', tableRows);
}

function renderIndexPage2(posts) {    //content.html
  let tableRows = '';
  posts.forEach(post => {
    tableRows += `
      <tr>
        <td>${post.num}</td>
        <td><a href="/posts/${post.num}">${post.title}</a></td>
        <td>${post.content}</td>
        <td>${post.writer}</td>
        <td>${post.date}</td>
      </tr>
    `;
  });

  const html = fs.readFileSync(path.join(__dirname, 'content.html'), 'utf8');
  return html.replace('<!-- 동적으로 생성된 테이블 행 -->', tableRows);
}

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

app.get('/content.html', (req, res) => {
  const filePath = path.join(__dirname, 'content.html');
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
