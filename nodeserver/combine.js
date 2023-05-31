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
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');

    // 게시물 저장
    await conn.query('INSERT INTO tbl_board (title, content, writer) VALUES (?, ?, ?)', [title, content, writer]);

    // 저장된 게시물의 num 가져오기
    const result = await conn.query('SELECT num FROM tbl_board WHERE title = ? AND content = ? AND writer = ?', [title, content, writer]);
    const postId = result[0].num;

    res.redirect('/index.html'); // index.html로 리디렉션
  } catch (err) {
    res.status(500).send('글 작성 중 오류가 발생했습니다.');
  } finally {
    if (conn) conn.end();
  }
});

app.post('/comment/:id', async (req, res) => {
  const postId = req.params.id;
  const commentWriter = req.body.writer;
  const commentContent = req.body.content;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');

    // 댓글 저장
    await conn.query('INSERT INTO comment (c_writer, c_content, post_id) VALUES (?, ?, ?)', [commentWriter, commentContent, postId]);

    res.sendStatus(200); // Success status
    res.redirect('/index.html'); // index.html로 리디렉션
  } catch (err) {
    console.error('댓글 작성 중 오류:', err);
    res.sendStatus(500); // Internal server error status
  } finally {
    if (conn) conn.end();
  }
});


app.get('/comments/:id', async (req, res) => {
  const postId = req.params.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    const results = await conn.query('SELECT * FROM comment WHERE post_id = ?', [postId]);

    res.json({ comments: results }); // JSON response with comments array

  } catch (err) {
    console.error('댓글 가져오기 오류:', err);
    res.sendStatus(500); // Internal server error status
  } finally {
    if (conn) conn.end();
  }
});




app.get('/', (req, res) => {
  res.redirect('/index.html'); // index.html로 리디렉션
});

app.get('/index.html', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    const results = await conn.query('SELECT num, title, writer, date FROM tbl_board');
    const html = renderIndexTable(results);
    res.send(html);
  } catch (err) {
    res.status(500).send('내부 서버 오류');
  } finally {
    if (conn) conn.end();
  }
});

function renderIndexTable(posts, currentPage, totalPages) {
  let tableRows = '';
  posts.forEach(post => {
    tableRows += `
      <tr>
        <td>${post.num}</td>
        <td><a href="/post/${post.num}">${post.title}</a></td>
        <td>${post.writer}</td>
        <td>${new Date(post.date).toLocaleDateString()}</td>
      </tr>
    `;
  });

  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const pagination = renderPagination(currentPage, totalPages);
  return html.replace('<!-- 동적으로 생성된 테이블 행 -->', tableRows).replace('<!-- 페이징 -->', pagination);
}

function renderPagination(currentPage, totalPages) {
  let paginationHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<span>${i}</span>`;
    } else {
      paginationHTML += `<a href="/index.html?page=${i}">${i}</a>`;
    }
  }

  return paginationHTML;
}

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

// 게시물 API 엔드포인트
app.get('/content/:id', async (req, res) => {
  const postId = req.params.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    const results = await conn.query('SELECT num, title, content, writer, date FROM tbl_board WHERE num = ?', [postId]);

    if (results.length === 0) {
      res.status(404).send('게시글을 찾을 수 없습니다.');
      return;
    }

    const post = results[0];

    res.json({ post }); // JSON 형식으로 게시물 데이터 응답

  } catch (err) {
    console.error('게시물 가져오기 오류:', err);
    res.status(500).send('내부 서버 오류');
  } finally {
    if (conn) conn.end();
  }
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


app.get('/post/:id', async (req, res) => {
  const postId = req.params.id;
  res.redirect(`/content.html?id=${postId}`);
});

app.delete('/delete/:id', async (req, res) => {
  const postId = req.params.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');
    await conn.query('DELETE FROM tbl_board WHERE num = ?', [postId]);

    res.json({ message: '게시물이 삭제되었습니다.' });

  } catch (err) {
    console.error('게시물 삭제 오류:', err);
    res.status(500).json({ error: '게시물 삭제 중 오류가 발생했습니다.' });
  } finally {
    if (conn) conn.end();
  }
});


server.listen(serverPort, () => {
  console.log('Server 작동 중...');
});
