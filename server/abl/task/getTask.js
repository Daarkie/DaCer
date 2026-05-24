const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const tasksDao = require("../../dao/tasksDao");
const {getGoal} = require("../../dao/goalsDao");

// Validating schema to use
const schema = {
    type: "object",
    oneOf: [{
        properties: {
            id: { type: "string", minLength: 64, maxLength: 64 }
        },
        required: ["id"],
    }, {
        properties: {
            name: { type: "string", maxLength: 100 }
        },
        required: ["name"],
    }],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function getAbl(req, res) {
    try {
        const data = req.query?.id || req.query?.name ? req.query : req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (!tasksDao.getTask(data.id)) {
            return res.status(404).json({error: `Task id: ${data.id} not found`});
        }

        const task = getGoal(data.id || data.name, !!data.name);
        if (!task) {
            if (data.id) {
                return res.status(404).json({error: `Task with id: ${data.id} not found`});
            }
            return res.status(404).json({error: `Task with name: "${data.id}" not found`});
        }

        return task;

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = getAbl;