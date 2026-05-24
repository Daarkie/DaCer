const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const goalsDao = require("../../dao/goalsDao");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        id: {type: "string", minLength: 64, maxLength: 64},
        name: {type: "string", maxLength: 100},
        responsibility: {type: "string", maxLength: 100},
        summary: {type: "string", maxLength: 350},
        deadline: {type: "integer"},
        parent_id: {type: "string"},
        priority: {type: "integer", minimum: 1, maximum: 10},
        notes: {type: "string", maxLength: 350},
    },
    required: ["id"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function updateAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (goalsDao.getGoal(data.id)) {
            return res.status(400).json({error: "Goal id not found"});
        }

        data.name = data.name?.trim();
        data.responsibility = data.responsibility?.trim();
        data.summary = data.summary?.trim();
        data.notes = data.notes?.trim();
        let parent = goalsDao.getGoal(data.parent_id);
        while (parent?.parent_id) {
            if (parent.parent_id === data.id) {
                return res.status(400).json({error: "Circular dependency of the parent goal"});
            }
            parent = goalsDao.getGoal(parent.parent_id);
        }
        data.parent_id = parent ? data.parent_id : null;

        return goalsDao.updateGoal(data);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = updateAbl;