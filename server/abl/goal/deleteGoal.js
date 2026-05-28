const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const goalsDao = require("../../dao/goalsDao");
const {listTasks} = require("../../dao/tasksDao");
const deleteTask = require("../task/deleteTask");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        id: {type: "string", minLength: 32, maxLength: 32},
        full_delete: {type: "boolean"},
    },
    required: ["id"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function deleteAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (!goalsDao.getGoal(data.id)) {
            return res.status(404).json({error: `Goal with ID: ${data.id} not found`});
        }

        //  Check child Goals and child Tasks, delete all if advised with "full_delete"
        const childTasks = listTasks(`parent_id = ${data.id}`);
        const childGoals = goalsDao.listChildGoals(data.id);
        if (childTasks || childGoals) {
            if (!data.full_delete) {
                return res.status(400).json({error: `Goal with ID: ${data.id} you are trying to delete has children`});
            }
            for (const goal of childGoals) {
                deleteAbl({
                    body: {
                        id: goal.id,
                        full_delete: goal.full_delete
                    }
                });
            }
            for (const task of childTasks) {
                deleteTask({body: {id: task.id}});
            }
        }

        return res.status(200).json(goalsDao.deleteGoal(data.id));

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = deleteAbl;