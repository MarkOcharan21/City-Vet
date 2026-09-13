require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

(async () => {
  const [r] = await db.query(
    `SELECT CASE
       WHEN DATE(created_at) = CURDATE() THEN '1-Today'
       WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) THEN '2-Earlier this week'
       WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) THEN '3-Last week'
       WHEN created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01') THEN '4-Last month'
       WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-01-01') THEN '5-Earlier this year'
       ELSE '6-Earlier' END AS grp,
       COUNT(*) AS n
     FROM pets GROUP BY grp ORDER BY grp`
  );
  console.table(r);
  await db.end();
})();
