const express = require("express");
const router = express.Router();

const GetAbl = require("../abl/goal/getGoal");
const ListAbl = require("../abl/goal/listGoals");
const ChildrenAbl = require("../abl/goal/listChildGoals");
const CreateAbl = require("../abl/goal/createGoal");
const UpdateAbl = require("../abl/goal/updateGoal");
const DeleteAbl = require("../abl/goal/deleteGoal");

router.get("/get", GetAbl);
router.get("/list", ListAbl);
router.post("/children", ChildrenAbl);
router.post("/create", CreateAbl);
router.post("/update", UpdateAbl);
router.post("/delete", DeleteAbl);

module.exports = router;