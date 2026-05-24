const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const tasksDao = require("../../dao/tasksDao");
const {getGoal} = require("../../dao/goalsDao");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        name: {type: "string", maxLength: 100},
        content: {type: "string", maxLength: 350},
        dependencies: {type: "string"},
        length: {type: "integer", minimum: 0},
        parent_id: {type: "string", minLength: 64, maxLength: 64},
        notes: {type: "string", maxLength: 350},
    },
    required: ["name", "length", "parent_id"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function createAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (!getGoal(data.parent_id)) {
            return res.status(404).json({error: `Parent goal with ID: ${data.parent_id} not found`});
        }

        // Check if all dependency Tasks exist in DB
        for (const dependency in data.dependencies.split(",")) {
            if (!tasksDao.getTask(dependency)) {
                return res.status(404).json({error: `Dependency with ID: ${dependency} not found`});
            }
        }

        data.name = data.name.trim();
        if (tasksDao.getTask(data.name, true)) {
            return res.status(400).json({error: `Task named: "${data.name}" already exists`});
        }

        data.content = data.content?.trim();

        data.notes = data.notes?.trim();

        return tasksDao.createTask(data);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = createAbl;