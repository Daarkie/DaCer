const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const tasksDao = require("../../dao/tasksDao");
const {getGoal} = require("../../dao/goalsDao");
const {getTask} = require("../../dao/tasksDao");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        id: { type: "string", minLength: 64, maxLength: 64 },
        name: {type: "string", maxLength: 100},
        content: {type: "string", maxLength: 350},
        dependencies: {type: "string"},
        length: {type: "integer", minimum: 0},
        parent_id: {type: "string", minLength: 64, maxLength: 64},
        notes: {type: "string", maxLength: 350},
    },
    required: ["id"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function isCircularDependency(dependency, id) {
    if (dependency.id === id) {
        return true;
    }

    if (dependency.dependencies) {
        for (const dep of dependency.dependencies.split(",")) {
            const nextTask = getTask(dep);
            if (isCircularDependency(nextTask, id))
                return true;
        }
    }
    return false;
}

function updateAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        // Check if parent Goal exists
        if (!getGoal(data.parent_id)) {
            return res.status(404).json({error: `Parent goal with ID: ${data.parent_id} not found`});
        }

        // Check if all dependency Tasks exist in DB
        for (const dependency in data.dependencies.split(",")) {
            if (!tasksDao.getTask(dependency)) {
                return res.status(404).json({error: `Dependency with ID: ${dependency} not found`});
            }
            // And they are not dependent on each other
            if (isCircularDependency(dependency, data.id)) {
                return res.status(400).json({error: `Dependency with ID: ${dependency} is circular`});
            }
        }

        data.name = data.name.trim();
        if (tasksDao.getTask(data.name, true)) {
            return res.status(400).json({error: `Task named: "${data.name}" already exists`});
        }

        data.content = data.content?.trim();

        data.notes = data.notes?.trim();

        return tasksDao.updateTask(data);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = updateAbl;