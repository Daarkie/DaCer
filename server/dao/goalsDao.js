const crypto = require("crypto");
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('data/dacer_db.db')

function foundGoalsTable() {
    db.exec(`CREATE TABLE IF NOT EXISTS "goals"
             (
                 "id"
                     TEXT,
                 "name"
                     TEXT
                     NOT NULL
                     UNIQUE,
                 "responsibility"
                     TEXT,
                 "summary"
                     TEXT,
                 "deadline"
                     INTEGER
                     NOT NULL,
                 "parent_id"
                     TEXT,
                 "priority"
                     INTEGER
                     NOT NULL,
                 "notes"
                     TEXT,
                 PRIMARY KEY ("id")
             )`)

    return true;
}

function listGoals() {
    return filterGoals("*");
}

function listChildGoals(parentId) {
    return filterGoals("*", `parent_id = ${parentId}`);
}

function getGoal(goalIdentification, isName = false) {
    if (isName) {
        return filterGoals("*", `name = ${goalIdentification}`)[0];
    }
    return filterGoals("*", `id = ${goalIdentification}`)[0];
}

function filterGoals(cols, filters) {
    let query;
    if (!filters) {
        query = db.prepare(`SELECT ${cols}
                            FROM goals`);
    } else {
        query = db.prepare(`SELECT ${cols}
                            FROM goals
                            WHERE ${filters}`)
    }
    return query.all();
}

function createGoal(goal) {
    goal.id = crypto.randomBytes(32).toString(16);
    return addGoal(goal);
}

function addGoal(goal) {
    db.exec(`INSERT INTO goals (id, name, responsibility, summary, deadline, parent_id, priority, notes)
             VALUES (${goal.id}, ${goal.name}, ${goal.responsibility}, ${goal.summary}, ${goal.deadline},
                     ${goal.parentId},
                     ${goal.priority}, ${goal.notes})`);
    return goal;
}

function updateGoal(goal) {
    db.exec(`UPDATE goals
             SET name           = ${goal.name},
                 responsibility = ${goal.responsibility},
                 summary        = ${goal.summary},
                 deadline       = ${goal.deadline},
                 parent_id      = ${goal.parentId},
                 priority       = ${goal.priority},
                 notes          = ${goal.notes}
             WHERE id = ${goal.id}`)
    return goal;
}

function deleteGoal(goalId) {
    db.exec(`DELETE
             FROM goals
             WHERE id = ${goalId}`);
    return goalId;
}

module.exports = {
    foundGoalsTable,
    listGoals,
    getGoal,
    listChildGoals,
    createGoal,
    updateGoal,
    deleteGoal
};