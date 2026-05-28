const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./data/dacer_db.db");

module.exports = db;