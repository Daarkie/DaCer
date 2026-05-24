const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const ajv = new Ajv();
addFormats(ajv);

const goalsDao = require("../../dao/goalsDao");

// Validating schema to use
const schema = {
    type: "object",
    properties: {
        id: { type: "string", minimum: 64, maximum: 64 }
    },
    required: ["id"],
    additionalProperties: false,
};

const validate = ajv.compile(schema);

function childGoalsAbl(req, res) {
    try {
        const data = req.body;

        const valid = validate(data);
        if (!valid) {
            return res.status(400).json({error: validate.errors});
        }

        //  Check goal exists first
        if (!goalsDao.getGoal(data.id)) {
            return res.status(400).json({error: `Goal with ID: ${data.id} not found`});
        }

        return goalsDao.listChildGoals(data.id);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = childGoalsAbl;