const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const tasksDao = require("../../dao/tasksDao");

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

function deleteAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        if (!tasksDao.getTask(data.id)) {
            return res.status(404).json({error: `Task id: ${data.id} not found`});
        }

        //  To remove other tasks' dependency on the deleted one
        const taskDependants = tasksDao.listDependantTasks(data.id);
        for (const taskDep of taskDependants) {
            const deps = taskDep.dependencies.split(",");
            const newDep = deps.filter(dep => data.id !== dep).join(",");
            tasksDao.updateTask({id: taskDep.id, dependencies: newDep});
        }

        return res.status(200).json(tasksDao.deleteTask(data.id));

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = deleteAbl;