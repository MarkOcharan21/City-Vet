require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign(
  { id: 4, email: 'kbtrinidad12@cityvet.com', role: 'Owner' },
  process.env.JWT_SECRET,
  { expiresIn: '8h' },
);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/drafts/2',
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log('body', data);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

req.end();
