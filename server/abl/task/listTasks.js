const tasksDao = require("../../dao/tasksDao");

function listAbl(req, res) {
    try {
        return res.status(200).json(tasksDao.listTasks());

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = listAbl;