const crypto = require("crypto");
const {DatabaseSync} = require("node:sqlite");

const { taskTag } = require("../utils/enums");

const db = require("./db");

function foundTasksTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks
        (
            id           TEXT PRIMARY KEY,
            name         TEXT    NOT NULL UNIQUE,
            status       TEXT    NOT NULL DEFAULT 'NOT_STARTED',
            content      TEXT,
            dependencies TEXT,
            length       INTEGER NOT NULL,
            started      INTEGER,
            parent_id    TEXT    NOT NULL,
            notes        TEXT
        )
    `);

    return true;
}

function listTasks() {
    return db.prepare(`
        SELECT *
        FROM tasks
    `).all();
}

function listTasksByParentGoal(parentId) {
    return db.prepare(`
        SELECT *
        FROM tasks
        WHERE parent_id = $parentId
    `).all({
        $parentId: parentId
    });
}

function getTask(identification, isName = false) {
    if (isName) {
        return db.prepare(`
            SELECT *
            FROM tasks
            WHERE name = $name
            LIMIT 1
        `).get({
            $name: identification
        });
    }

    return db.prepare(`
        SELECT *
        FROM tasks
        WHERE id = $id
        LIMIT 1
    `).get({
        $id: identification
    });
}

function createTask(task) {
    const newTask = {
        ...task,
        id: crypto.randomBytes(32).toString("hex"),
        status: task.status ?? taskTag.NOT_STARTED
    };

    db.prepare(`
        INSERT INTO tasks (id,
                           name,
                           status,
                           content,
                           dependencies,
                           length,
                           started,
                           parent_id,
                           notes)
        VALUES ($id,
                $name,
                $status,
                $content,
                $dependencies,
                $length,
                $started,
                $parentId,
                $notes)
    `).run({
        $id: newTask.id,
        $name: newTask.name,
        $status: newTask.status,
        $content: newTask.content ?? null,
        $dependencies: normalizeDependencies(newTask.dependencies),
        $length: newTask.length,
        $started: newTask.started ?? null,
        $parentId: newTask.parentId,
        $notes: newTask.notes ?? null
    });

    return newTask;
}

function updateTaskStatus(taskId, taskStatus) {
    const started =
        taskStatus === taskTag.IN_PROGRESS || taskStatus === taskTag.DONE
            ? new Date().setUTCHours(0, 0, 0, 0)
            : null;

    db.prepare(`
        UPDATE tasks
        SET status  = $status,
            started = COALESCE(started, $started)
        WHERE id = $id
    `).run({
        $id: taskId,
        $status: taskStatus,
        $started: started
    });

    return getTask(taskId);
}

function updateTask(task) {
    db.prepare(`
        UPDATE tasks
        SET name         = COALESCE($name, name),
            content      = COALESCE($content, content),
            dependencies = COALESCE($dependencies, dependencies),
            length       = COALESCE($length, length),
            parent_id    = COALESCE($parentId, parent_id),
            notes        = COALESCE($notes, notes)
        WHERE id = $id
    `).run({
        $id: task.id,
        $name: task.name ?? null,
        $content: task.content ?? null,
        $dependencies: task.dependencies === undefined
            ? null
            : normalizeDependencies(task.dependencies),
        $length: task.length ?? null,
        $parentId: task.parentId ?? null,
        $notes: task.notes ?? null
    });

    return getTask(task.id);
}

function listDependantTasks(taskId) {
    return db.prepare(`
        SELECT *
        FROM tasks
        WHERE dependencies LIKE '%$taskId%'
    `).all({
        $taskId: taskId
    });
}

function deleteTask(taskId) {
    db.prepare(`
        DELETE
        FROM tasks
        WHERE id = $id
    `).run({
        $id: taskId
    });

    return taskId;
}

function normalizeDependencies(dependencies) {
    if (!dependencies) {
        return null;
    }

    if (Array.isArray(dependencies)) {
        return dependencies.join(",");
    }

    return dependencies;
}

module.exports = {
    foundTasksTable,
    createTask,
    getTask,
    listTasks,
    listDependantTasks,
    listTasksByParentGoal,
    deleteTask,
    updateTask,
    updateTaskStatus
};