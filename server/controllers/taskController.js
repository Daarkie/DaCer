const express = require("express");
const router = express.Router();

const GetAbl = require("../abl/task/getTask");
const ListAbl = require("../abl/task/listTasks");
const ChildrenAbl = require("../abl/task/listChildTasks");
const CreateAbl = require("../abl/task/createTask");
const StatusAbl = require("../abl/task/statusUpdateTask");
const UpdateAbl = require("../abl/task/updateTask");
const DeleteAbl = require("../abl/task/deleteTask");

router.get("/get", GetAbl);
router.get("/list", ListAbl);
router.post("/children", ChildrenAbl)
router.post("/create", CreateAbl);
router.post("/status", StatusAbl);
router.post("/update", UpdateAbl);
router.post("/delete", DeleteAbl);

module.exports = router;