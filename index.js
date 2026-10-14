require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 IIITL Market Server is running on port ${PORT}`);
  console.log(`🎓 Exclusive to @iiitl.ac.in students`);
  console.log(`🌐 http://localhost:${PORT}\n`);
});
