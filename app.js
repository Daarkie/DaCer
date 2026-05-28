const express = require("express");
const initDb = require("./server/dao/initDb");

const app = express();
const port = 3000;

const taskController = require("./server/controllers/taskController");
const goalController = require("./server/controllers/goalController");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDb();

app.get("/", (req, res) => {
    res.send("Frontend TBD!");
});

app.use("/task", taskController);
app.use("/goal", goalController);

app.listen(port, () => {
    console.log(`DaCer app listening on port ${port}`);
});