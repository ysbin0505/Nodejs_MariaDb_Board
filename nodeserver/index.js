const mdbConn = require('./mariaDBConn.js')
const express = require('express');
const app = express();
 
mdbConn.getUserList()
  .then((rows) => {
    console.log(rows);
  })
  .catch((errMsg) => {
    console.log(errMsg);
  });
 
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});