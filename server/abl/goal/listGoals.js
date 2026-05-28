const goalsDao = require("../../dao/goalsDao");

function listAbl(req, res) {
    try {
        return res.status(200).json(goalsDao.listGoals());

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = listAbl;