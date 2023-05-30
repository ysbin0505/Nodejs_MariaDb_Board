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


app.get('/index.html', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // 현재 페이지
  const perPage = 10; // 페이지당 게시물 수

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('USE nodejs_test');

    // 전체 게시물 수 조회
    const totalCountResult = await conn.query('SELECT COUNT(*) AS total FROM tbl_board');
    const totalCount = totalCountResult[0].total;

    // 총 페이지 수 계산
    const totalPages = Math.ceil(totalCount / perPage);

    // 현재 페이지에 해당하는 게시물 조회
    const offset = (page - 1) * perPage;
    const results = await conn.query('SELECT num, title, writer, date FROM tbl_board LIMIT ?, ?', [offset, perPage]);

    const html = renderIndexTable(results, page, totalPages);
    res.send(html);
  } catch (err) {
    console.error('내부 서버 오류:', err);
    res.status(500).send('내부 서버 오류');
  } finally {
    if (conn) conn.end();
  }
});



function renderContentPage(post) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${post.title}</title>
        <style>
          /* 스타일 코드 */
        </style>
      </head>
      <body>
        <h1>게시물 내용</h1>
        <div class="post-content" id="post-content">
          <p><strong>번호:</strong> ${post.num}</p>
          <p><strong>제목:</strong> ${post.title}</p>
          <p><strong>내용:</strong> ${post.content}</p>
          <p><strong>작성자:</strong> ${post.writer}</p>
          <p><strong>날짜:</strong> ${new Date(post.date).toLocaleDateString()}</p>
        </div>

        <div style="display: flex; justify-content: center;">
          <button type="button" class="navyBtn" onclick="location.href = '/index.html'">돌아가기</button>
        </div>
      </body>
    </html>
  `;
  return html;
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
