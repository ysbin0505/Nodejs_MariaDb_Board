router.get('/page/:page',function(req,res,next)
{
    var page = req.params.page;
    var sql = "select num, title, content, writer, date from tbl_board";
    conn.query(sql, function (err, rows) {
        if (err) console.error("err : " + err);
        res.render('page', {title: ' 게시판 리스트', rows: rows, page:page, length:rows.length-1, page_num:10, pass:true});
        console.log(rows.length-1);
    });
});