require('dotenv').config();
const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
