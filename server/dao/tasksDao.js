const crypto = require("crypto");
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('data/dacer_db.db')

function foundTasksTable() {
    db.exec(`CREATE TABLE IF NOT EXISTS "tasks"
             (
                 "id"
                     TEXT,
                 "name"
                     TEXT
                     NOT NULL
                     UNIQUE,
                 "status"
                     TEXT
                     NOT NULL
                     DEFAULT
                         ${taskTag.NOT_STARTED},
                 "content"
                     TEXT,
                 "dependencies"
                     TEXT,
                 "length"
                     INTEGER
                     NOT NULL,
                 "started"
                     INTEGER,
                 "parent_id"
                     TEXT
                     NOT NULL,
                 "notes"
                     TEXT,
                 PRIMARY KEY ("id")
             )`);
}

function getTask(identification, isName = false) {
    if (isName) {
        return listTasks(`name = ${identification}`)[0];
    }
    return listTasks(`id = ${identification}`)[0];
}

function listTasks(filters, cols = "*") {
    let query;
    if (!filters) {
        query = db.prepare(`SELECT ${cols}
                            FROM tasks`);
    } else {
        query = db.prepare(`SELECT ${cols}
                            FROM tasks
                            WHERE ${filters}`)
    }
    return query.all();
}

function createTask(task) {
    task.id = crypto.randomBytes(32).toString(16);
    return addTask(task);
}

function addTask(task) {
    db.exec(`INSERT INTO tasks (id, name, content, dependencies, length, parent_id, notes)
             VALUES (${task.id}, ${task.name}, ${task.content}, ${task.dependencies}, ${task.length},
                     ${task.parentId}, ${task.notes})`);
    return task;
}

function updateTaskStatus(taskId, taskStatus) {
    db.exec(`UPDATE tasks
             SET status = ${taskStatus}
             WHERE id = ${taskId}`);

    if (taskStatus === taskTag.IN_PROGRESS || taskStatus === taskTag.DONE) {
        const today = new Date().setUTCHours(0, 0, 0, 0);
        db.exec(`INSERT OR IGNORE tasks SET started = ${today} WHERE taskId = ${taskId}`);
    }
}

function updateTask(task) {
    db.exec(`UPDATE tasks
             SET name         = COALESCE(${task.name}, name),
                 content      = COALESCE(${task.content}, content),
                 dependencies = COALESCE(${task.dependencies}, dependencies),
                 length       = COALESCE(${task.length}, length),
                 parent_id    = COALESCE(${task.parentId}, parent_id),
                 notes        = COALESCE(${task.notes}, notes)
             WHERE id = ${task.id}`)
    return task;
}

function deleteTask(taskId) {
    db.exec(`DELETE
             FROM tasks
             WHERE id = ${taskId}`);
}

module.exports = {
    createTask,
    getTask,
    listTasks,
    deleteTask,
    updateTask,
    updateTaskStatus
}