const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const goalsDao = require("../../dao/goalsDao");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        name: {type: "string", maxLength: 100},
        responsibility: {type: "string", maxLength: 100},
        summary: {type: "string", maxLength: 350},
        deadline: {type: "integer"},
        parent_id: {type: "string"},
        priority: {type: "integer", minimum: 1, maximum: 10},
        notes: {type: "string", maxLength: 350},
    },
    required: ["name", "deadline", "priority"],
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

        data.name = data.name.trim();
        if (goalsDao.getGoal(data.name, true)) {
            return res.status(400).json({error: `Goal named: "${data.name}" already exists`});
        }

        data.responsibility = data.responsibility?.trim();
        data.summary = data.summary?.trim();
        data.notes = data.notes?.trim();
        data.parent_id = goalsDao.getGoal(data.parent_id) ? data.parent_id : null;

        return goalsDao.createGoal(data);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = createAbl;