const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const tasksDao = require("../../dao/tasksDao");
const {taskTag} = require("../../utils/enums");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        id: { type: "string", minLength: 64, maxLength: 64 },
        status: {type: "string", oneOf: [{pattern: taskTag.IN_PROGRESS}, {pattern: taskTag.BLOCKED}, {pattern: taskTag.NOT_STARTED}, {pattern: taskTag.DONE}],}
    },
    required: ["id","status"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function statusAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (!tasksDao.getTask(data.id)) {
            return res.status(404).json({error: `Task with id: ${data.id} not found`});
        }

        return res.status(200).json(tasksDao.updateTaskStatus(data.id, data.status));

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = statusAbl;