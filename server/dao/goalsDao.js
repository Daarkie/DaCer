const crypto = require("crypto");
const {DatabaseSync} = require("node:sqlite");

const db = require("./db");

function foundGoalsTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS goals
        (
            id             TEXT PRIMARY KEY,
            name           TEXT NOT NULL UNIQUE,
            responsibility TEXT,
            summary        TEXT,
            deadline       INTEGER NOT NULL,
            parent_id      TEXT,
            priority       INTEGER NOT NULL,
            notes          TEXT
        )
    `);

    return true;
}

function listGoals() {
    return db.prepare(`
        SELECT *
        FROM goals
    `).all();
}

function listChildGoals(parent_id) {
    return db.prepare(`
        SELECT *
        FROM goals
        WHERE parent_id = $parent_id
    `).all({
        $parent_id: parent_id
    });
}

function getGoal(goalIdentification, isName = false) {
    if (isName) {
        return db.prepare(`
            SELECT *
            FROM goals
            WHERE name = $name
            LIMIT 1
        `).get({
            $name: goalIdentification
        });
    }

    return db.prepare(`
        SELECT *
        FROM goals
        WHERE id = $id
        LIMIT 1
    `).get({
        $id: goalIdentification
    });
}

function createGoal(goal) {
    const newGoal = {
        ...goal,
        id: crypto.randomBytes(16).toString("hex")
    };

    db.prepare(`
        INSERT INTO goals (id,
                           name,
                           responsibility,
                           summary,
                           deadline,
                           parent_id,
                           priority,
                           notes)
        VALUES ($id,
                $name,
                $responsibility,
                $summary,
                $deadline,
                $parent_id,
                $priority,
                $notes)
    `).run({
        $id: newGoal.id,
        $name: newGoal.name,
        $responsibility: newGoal.responsibility ?? null,
        $summary: newGoal.summary ?? null,
        $deadline: newGoal.deadline,
        $parent_id: newGoal.parent_id ?? null,
        $priority: newGoal.priority,
        $notes: newGoal.notes ?? null
    });

    return newGoal;
}

function updateGoal(goal) {
    db.prepare(`
        UPDATE goals
        SET name           = COALESCE($name, name),
            responsibility = COALESCE($responsibility, responsibility),
            summary        = COALESCE($summary, summary),
            deadline       = COALESCE($deadline, deadline),
            parent_id      = COALESCE($parent_id, parent_id),
            priority       = COALESCE($priority, priority),
            notes          = COALESCE($notes, notes)
        WHERE id = $id
    `).run({
        $id: goal.id,
        $name: goal.name ?? null,
        $responsibility: goal.responsibility ?? null,
        $summary: goal.summary ?? null,
        $deadline: goal.deadline ?? null,
        $parent_id: goal.parent_id ?? null,
        $priority: goal.priority ?? null,
        $notes: goal.notes ?? null
    });

    return getGoal(goal.id);
}

function deleteGoal(goalId) {
    db.prepare(`
        DELETE
        FROM goals
        WHERE id = $id
    `).run({
        $id: goalId
    });

    return goalId;
}

module.exports = {
    foundGoalsTable,
    listGoals,
    listChildGoals,
    getGoal,
    createGoal,
    updateGoal,
    deleteGoal
};