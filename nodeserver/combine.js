const path = require("path");
const http = require("http");
const fs = require("fs");
const mariadb = require("mariadb");
const express = require("express");

const app = express();
const server = http.createServer(app);

const DBHost = "127.0.0.1";
const DBPort = "3306";
const DBUser = "root";
const DBPass = "qls515";
const connectionLimit = 5;

const pool = mariadb.createPool({
  host: DBHost,
  port: DBPort,
  user: DBUser,
  password: DBPass,
  connectionLimit: connectionLimit,
  database: "nodejs_test",
  bigIntAsNumber: true,
});

// body-parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/add", async (req, res) => {
  // 게시물 정보 가져오기
  const title = req.body.title;
  const content = req.body.content;
  const writer = req.body.writer;

  let conn;
  try {
    conn = await pool.getConnection();

    // 게시물 저장
    await conn.query(
      "INSERT INTO tbl_board (title, content, writer) VALUES (?, ?, ?)",
      [title, content, writer]
    );

    // 저장된 게시물의 num 가져오기
    const result = await conn.query(
      "SELECT num FROM tbl_board WHERE title = ? AND content = ? AND writer = ?",
      [title, content, writer]
    );
    const postId = result[0].num;

    res.redirect("/index.html"); // index.html로 리디렉션
  } catch (err) {
    res.status(500).send("글 작성 중 오류가 발생했습니다.");
  } finally {
    if (conn) conn.end();
  }
});

app.get("/", (req, res) => {
  res.redirect("/index.html"); // index.html로 리디렉션
});

app.get("/index.html", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const results = await conn.query(
      "SELECT num, title, writer, date FROM tbl_board"
    );
    const html = renderIndexTable(results);
    res.send(html);
  } catch (err) {
    res.status(500).send("내부 서버 오류");
  } finally {
    if (conn) conn.end();
  }
});

function renderIndexTable(posts, currentPage, totalPages) {
  let tableRows = "";
  posts.forEach((post) => {
    tableRows += `
      <tr>
        <td>${post.num}</td>
        <td><a href="/post/${post.num}">${post.title}</a></td>
        <td>${post.writer}</td>
        <td>${new Date(post.date).toLocaleDateString()}</td>
      </tr>
    `;
  });

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const pagination = renderPagination(currentPage, totalPages);
  return html
    .replace("<!-- 동적으로 생성된 테이블 행 -->", tableRows)
    .replace("<!-- 페이징 -->", pagination);
}

function renderPagination(currentPage, totalPages) {
  let paginationHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<span>${i}</span>`;
    } else {
      paginationHTML += `<a href="/index.html?page=${i}">${i}</a>`;
    }
  }

  return paginationHTML;
}

pool
  .getConnection()
  .then((conn) => {
    console.log("데이터베이스 연결 성공");
    conn.release();
  })
  .catch((err) => {
    console.error("데이터베이스 연결 오류:", err);
  });

const serverPort = process.env.PORT || 3000;

app.get("/write.html", (req, res) => {
  const filePath = path.join(__dirname, "write.html");
  fs.readFile(filePath, "utf8", function (err, data) {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(data);
  });
});

// 게시글 조회 API 엔드포인트
app.get("/contents", async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const offset = (Number(page) - 1) * limit;

  let conn;
  try {
    conn = await pool.getConnection();

    // 게시글 조회 쿼리 실행
    const query = `SELECT * FROM tbl_board ORDER BY num DESC LIMIT ? OFFSET ?`;
    const rows = await conn.query(query, [Number(limit), offset]);

    // 전체 게시글 수 조회 쿼리 실행
    const countQuery = "SELECT COUNT(*) as total FROM tbl_board";
    const [{ total }] = await conn.query(countQuery);

    // 결과 반환
    res.json({
      total,
      offset: Number(offset),
      limit: Number(limit),
      data: rows,
    });
  } catch (err) {
    console.error("Error during database query:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (conn) {
      // 연결 반환
      conn.release();
    }
  }
});

// 게시물 API 엔드포인트
app.get("/content/:id", async (req, res) => {
  const postId = req.params.id;

  let conn;
  try {
    conn = await pool.getConnection();
    const results = await conn.query(
      "SELECT num, title, content, writer, date FROM tbl_board WHERE num = ?",
      [postId]
    );

    if (results.length === 0) {
      res.status(404).send("게시글을 찾을 수 없습니다.");
      return;
    }

    const post = results[0];

    res.json({ post }); // JSON 형식으로 게시물 데이터 응답
  } catch (err) {
    console.error("게시물 가져오기 오류:", err);
    res.status(500).send("내부 서버 오류");
  } finally {
    if (conn) conn.end();
  }
});

// 댓글 작성 API
app.post("/contents/:id/comments", async (req, res) => {
  const articleId = req.params.id;
  const { writer, content } = req.body;

  try {
    const conn = await pool.getConnection();

    const query = `
      INSERT INTO comment (c_writer, c_content, post_id)
      VALUES (?, ?, ?)
    `;
    const values = [writer, content, articleId];

    await conn.query(query, values);

    conn.release();

    res.status(201).json({ message: "댓글이 작성되었습니다." });
  } catch (error) {
    console.error("댓글 작성 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 댓글 조회 API
app.get("/contents/:id/comments", async (req, res) => {
  const articleId = req.params.id;

  try {
    const conn = await pool.getConnection();

    const query = `
      SELECT id, c_writer as writer, c_content as content, c_date as writtenAt
      FROM comment
      WHERE post_id = ?
      ORDER BY c_date DESC
    `;
    const values = [articleId];

    const rows = await conn.query(query, values);

    conn.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error("댓글 조회 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 댓글 삭제 API
app.delete("/comments/:id", async (req, res) => {
  const commentId = req.params.id;

  try {
    const conn = await pool.getConnection();

    const query = `
      DELETE FROM comment
      WHERE id = ?
    `;
    const values = [commentId];

    await conn.query(query, values);

    conn.release();

    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error("댓글 삭제 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

app.get("/content.html", (req, res) => {
  const filePath = path.join(__dirname, "content.html");
  fs.readFile(filePath, "utf8", function (err, data) {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(data);
  });
});

app.get("/post/:id", async (req, res) => {
  const postId = req.params.id;
  res.redirect(`/content.html?id=${postId}`);
});

app.delete("/delete/:id", async (req, res) => {
  const postId = req.params.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query("DELETE FROM tbl_board WHERE num = ?", [postId]);

    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (err) {
    console.error("게시물 삭제 오류:", err);
    res.status(500).json({ error: "게시물 삭제 중 오류가 발생했습니다." });
  } finally {
    if (conn) conn.end();
  }
});

server.listen(serverPort, () => {
  console.log("Server 작동 중...");
});
