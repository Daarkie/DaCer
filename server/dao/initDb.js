const goalsDao = require("./goalsDao");
const tasksDao = require("./tasksDao");

function initDb() {
    goalsDao.foundGoalsTable();
    tasksDao.foundTasksTable();

    console.log("Database tables initialized.");
}

module.exports = initDb;