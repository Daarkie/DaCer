const tasksDao = require("../../dao/tasksDao");

function listAbl(req, res) {
    try {
        return tasksDao.listTasks(false);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

module.exports = listAbl;