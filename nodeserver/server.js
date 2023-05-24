const path = require('path');
const http = require('http');
const fs = require('fs');

const server = http.createServer(function(request, response) {
  const filePath = path.join(__dirname, 'html', 'index.html');

  fs.readFile(filePath, 'utf8', function(err, data) {
    if (err) {
      response.writeHead(500, { 'Content-Type': 'text/plain' });
      response.end('Internal Server Error');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(data);
  });
});

server.listen(3000, function() {
  console.log('Server is running...');
});
