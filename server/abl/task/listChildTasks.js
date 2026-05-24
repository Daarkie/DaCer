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
        id: {type: "string", minLength: 64, maxLength: 64}
    },
    required: ["id"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function childrenAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (!getGoal(data.id)) {
            return res.status(404).json({error: `Goal with id: ${data.id} not found`});
        }

        return tasksDao.listTasks(`parent_id = ${data.id}`);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = childrenAbl;