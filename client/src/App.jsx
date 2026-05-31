import {useEffect, useMemo, useState} from "react";
import {
    ArrowDownUp,
    Check,
    Circle,
    Edit3,
    Filter,
    Plus,
    Trash2,
    X
} from "lucide-react";

const DAY = 24 * 60 * 60 * 1000;

const statusLabels = {
    NOT_STARTED: "No started",
    BLOCKED: "Blocked",
    IN_PROGRESS: "In progress",
    DONE: "Done"
};

const statusIcons = {
    NOT_STARTED: <Circle size={20}/>,
    IN_PROGRESS: <Circle size={20} className="ring-icon"/>,
    DONE: <Check size={24}/>,
    BLOCKED: <X size={24}/>
};

function formatDate(value) {
    if (!value) return "N/A";
    const date = new Date(Number(value));
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("cs-CZ");
}

function fromInputDate(value) {
    if (!value) return null;
    return new Date(`${value}T00:00:00`).getTime();
}

async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            signal: controller.signal
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
            throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
        }

        return data;
    } finally {
        clearTimeout(timeout);
    }
}

export default function App() {
    const [tab, setTab] = useState("goals");
    const [goals, setGoals] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [modal, setModal] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [taskFilters, setTaskFilters] = useState({
        hasDependencies: false,
        DONE: false,
        IN_PROGRESS: false,
        BLOCKED: false,
        NOT_STARTED: false
    });

    const [goalFilters, setGoalFilters] = useState({
        done100: false,
        hasNoTasks: false
    });

    const [sortKey, setSortKey] = useState("deadline");
    const [apiNotice, setApiNotice] = useState("");
    const hasGoals = goals.length > 0;

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const list = tab === "tasks" ? tasks : goals;

        if (!list.length) {
            setSelectedId(null);
            return;
        }

        if (selectedId === null) {
            return;
        }

        if (!list.some((item) => item.id === selectedId)) {
            setSelectedId(list[0].id);
        }
    }, [tab, tasks, goals, selectedId]);

    useEffect(() => {
        if (!apiNotice) return;

        const timer = setTimeout(() => {
            setApiNotice("");
        }, 6000);

        return () => clearTimeout(timer);
    }, [apiNotice]);

    useEffect(() => {
        if (!goals.length && tab === "tasks") {
            setTab("goals");
        }
    }, [goals.length, tab]);

    async function loadData() {
        try {
            const [goalList, taskList] = await Promise.all([
                fetchJson("/goal/list"),
                fetchJson("/task/list")
            ]);

            if (Array.isArray(goalList)) setGoals(goalList);
            if (Array.isArray(taskList)) setTasks(taskList);
            setApiNotice("");
        } catch (error) {
            setApiNotice("No data from backend");
        }
    }

    const visibleItems = useMemo(() => {
        const source = tab === "tasks" ? tasks : goals;
        let items = [...source];

        if (tab === "tasks") {
            const activeStatuses = Object.entries(taskFilters)
                .filter(([key, value]) => value && key !== "hasDependencies")
                .map(([key]) => key);

            if (taskFilters.hasDependencies) {
                items = items.filter((task) => Boolean(task.dependencies?.trim()));
            }

            if (activeStatuses.length) {
                items = items.filter((task) => activeStatuses.includes(task.status));
            }
        }

        if (tab === "goals") {
            if (goalFilters.done100) {
                items = items.filter((goal) => calculateGoalProgress(goal, goals, tasks) === 100);
            }

            if (goalFilters.hasNoTasks) {
                items = items.filter((goal) => !goalHasAnyTasks(goal, goals, tasks));
            }
        }

        items.sort((a, b) => {
            if (sortKey === "name") return a.name.localeCompare(b.name);
            if (sortKey === "priority") return Number(b.priority || 0) - Number(a.priority || 0);
            if (sortKey === "status") return String(a.status || "").localeCompare(String(b.status || ""));
            if (sortKey === "dependencies") return String(b.dependencies || "").length - String(a.dependencies || "").length;

            return Number(a.deadline || taskEndDate(a, goals) || 0) - Number(b.deadline || taskEndDate(b, goals) || 0);
        });

        return items;
    }, [tab, tasks, goals, taskFilters, goalFilters, sortKey]);

    const selected = useMemo(() => {
        const source = tab === "tasks" ? tasks : goals;
        return source.find((item) => item.id === selectedId) || null;
    }, [tab, tasks, goals, selectedId]);

    async function createGoal(form) {
        const newGoal = {
            id: crypto.randomUUID(),
            name: form.name.trim(),
            responsibility: form.responsibility.trim(),
            summary: form.summary.trim(),
            deadline: fromInputDate(form.deadline),
            parent_id: form.parent_id || null,
            priority: Number(form.priority),
            notes: form.notes.trim()
        };

        try {
            const saved = await fetchJson("/goal/create", {
                method: "POST",
                body: JSON.stringify({
                    name: newGoal.name,
                    responsibility: newGoal.responsibility,
                    summary: newGoal.summary,
                    deadline: newGoal.deadline,
                    parent_id: newGoal.parent_id || "",
                    priority: newGoal.priority,
                    notes: newGoal.notes
                })
            });
            setGoals((current) => [...current, saved || newGoal]);
            setApiNotice("");
        } catch {
            setGoals((current) => [...current, newGoal]);
            setApiNotice("Goal added locally only");
        }

        setModal(null);
        setTab("goals");
        setSelectedId(newGoal.id);
    }

    async function createTask(form) {
        const newTask = {
            name: form.name.trim(),
            content: form.content.trim(),
            dependencies: form.dependencies.join(","),
            length: Number(form.length),
            status: "NOT_STARTED",
            started: null,
            parent_id: form.parent_id,
            notes: form.notes.trim()
        };

        try {
            const saved = await fetchJson("/task/create", {
                method: "POST",
                body: JSON.stringify({
                    name: newTask.name,
                    content: newTask.content,
                    dependencies: newTask.dependencies,
                    length: newTask.length,
                    parent_id: newTask.parent_id,
                    notes: newTask.notes
                })
            });
            setTasks((current) => [...current, saved || newTask]);
            setApiNotice("");
        } catch {
            setTasks((current) => [...current, newTask]);
            setApiNotice("Task added locally only");
        }

        setModal(null);
        setTab("tasks");
        setSelectedId(newTask.id);
    }

    async function changeTaskStatus(task, status) {
        const updated = {
            ...task,
            status,
            started: task.started || (status === "IN_PROGRESS" || status === "DONE" ? Date.now() : null)
        };

        setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));

        try {
            await fetchJson("/task/status", {
                method: "POST",
                body: JSON.stringify({id: task.id, status})
            });
            setApiNotice("");
        } catch {
            setApiNotice("Status changed locally only.");
        }
    }

    async function removeSelected() {
        if (!selected) return;

        if (tab === "goals") {
            const hasSubGoals = goals.some((goal) => goal.parent_id === selected.id);
            const hasTasks = tasks.some((task) => task.parent_id === selected.id);

            if (hasSubGoals || hasTasks) {
                setApiNotice("This goal cannot be deleted because it has sub-goals or tasks. Delete or move them first.");
                return;
            }
        }

        const deletedTab = tab;
        const deletedItem = selected;

        try {
            await fetchJson(`/${deletedTab === "tasks" ? "task" : "goal"}/delete`, {
                method: "POST",
                body: JSON.stringify({id: deletedItem.id})
            });

            if (deletedTab === "tasks") {
                setTasks((current) => current.filter((task) => task.id !== deletedItem.id));
            }

            if (deletedTab === "goals") {
                setGoals((current) => current.filter((goal) => goal.id !== deletedItem.id));
            }

            setApiNotice("");
        } catch (error) {
            setApiNotice(error.message);
            console.error("Delete failed:", error);
        }
    }

    return (
        <main className="app-shell">
            <div className="top-bar">
                <nav className="tabs" aria-label="Main tabs">
                    <button className={tab === "goals" ? "tab active" : "tab"} onClick={() => setTab("goals")}>Goals
                    </button>
                    <button
                        className={tab === "tasks" ? "tab active" : "tab"}
                        onClick={() => hasGoals && setTab("tasks")}
                        disabled={!hasGoals}
                        title={!hasGoals ? "Create a goal first" : "Tasks"}
                    >
                        Tasks
                    </button>
                </nav>

                <h1>DaCer</h1>

                <div className="tools">
                    <div className="tool-wrap">
                        <button className="icon-button" onClick={() => setFilterOpen((open) => !open)} title="Filter">
                            <Filter/>
                        </button>
                        {filterOpen && (
                            tab === "tasks" ? (
                                <TaskFilterPanel filters={taskFilters} setFilters={setTaskFilters}/>
                            ) : (
                                <GoalFilterPanel filters={goalFilters} setFilters={setGoalFilters}/>
                            )
                        )}
                    </div>

                    <div className="tool-wrap">
                        <button className="icon-button" onClick={() => setSortOpen((open) => !open)} title="Sort">
                            <ArrowDownUp/>
                        </button>
                        {sortOpen && (
                            <SortPanel tab={tab} value={sortKey} setValue={setSortKey}/>
                        )}
                    </div>
                </div>
            </div>

            {apiNotice && (
                <div className="notice">
                    <span>{apiNotice}</span>
                    <button type="button" onClick={() => setApiNotice("")}>
                        ×
                    </button>
                </div>
            )}

            <section className={selected ? "workspace has-detail" : "workspace"}>
                {visibleItems.length === 0 ? (
                    <EmptyState tab={tab} onCreate={() => setModal(tab)}/>
                ) : (
                    <>
                        <section className="list-pane">
                            <div className="scroll-list">
                                {visibleItems.map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        tab={tab}
                                        goals={goals}
                                        tasks={tasks}
                                        active={item.id === selectedId}
                                        onClick={() => setSelectedId(item.id)}
                                        onStatusChange={changeTaskStatus}
                                    />
                                ))}
                            </div>
                            <button className="floating-add" onClick={() => setModal(tab)} aria-label="Create new">
                                <Plus size={56}/>
                            </button>
                        </section>

                        {selected && (
                            <DetailPane
                                item={selected}
                                tab={tab}
                                goals={goals}
                                tasks={tasks}
                                onClose={() => setSelectedId(null)}
                                onDelete={removeSelected}
                            />
                        )}
                    </>
                )}
            </section>

            {modal === "goals" && (
                <GoalModal
                    goals={goals}
                    onClose={() => setModal(null)}
                    onSubmit={createGoal}
                />
            )}

            {modal === "tasks" && (
                <TaskModal
                    goals={goals}
                    tasks={tasks}
                    onClose={() => setModal(null)}
                    onSubmit={createTask}
                />
            )}
        </main>
    );
}

function TaskFilterPanel({filters, setFilters}) {
    const rows = [
        ["hasDependencies", "Has dependencies"],
        ["DONE", "Is DONE"],
        ["IN_PROGRESS", "Is IN PROGRESS"],
        ["BLOCKED", "Is BLOCKED"],
        ["NOT_STARTED", "Is NOT STARTED"]
    ];

    return (
        <div className="popover filter-panel">
            {rows.map(([key, label]) => (
                <label key={key} className="check-row">
                    <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(event) => setFilters((current) => ({...current, [key]: event.target.checked}))}
                    />
                    <span className="fake-check">{filters[key] && <Check size={20}/>}</span>
                    {label}
                </label>
            ))}
        </div>
    );
}

function GoalFilterPanel({filters, setFilters}) {
    const rows = [
        ["done100", "Is 100% done"],
        ["hasNoTasks", "Has no tasks yet"]
    ];

    return (
        <div className="popover filter-panel">
            {rows.map(([key, label]) => (
                <label key={key} className="check-row">
                    <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(event) =>
                            setFilters((current) => ({
                                ...current,
                                [key]: event.target.checked
                            }))
                        }
                    />
                    <span className="fake-check">
            {filters[key] && <Check size={20}/>}
          </span>
                    {label}
                </label>
            ))}
        </div>
    );
}

function SortPanel({tab, value, setValue}) {
    const options = tab === "tasks"
        ? [
            ["DONE", "status DONE"],
            ["IN_PROGRESS", "status IN PROGRESS"],
            ["deadline", "deadline"],
            ["priority", "priority"],
            ["dependencies", "dependencies"],
            ["name", "name"]
        ]
        : [
            ["deadline", "deadline"],
            ["priority", "priority"],
            ["name", "name"]
        ];

    return (
        <div className="popover sort-panel">
            {options.map(([key, label], index) => (
                <button
                    key={key}
                    className={value === key ? "sort-row active" : "sort-row"}
                    onClick={() => setValue(key)}
                >
                    <span>{index + 1}</span>
                    <ArrowDownUp size={16}/>
                    {label}
                </button>
            ))}
        </div>
    );
}

function EmptyState({tab, onCreate}) {
    return (
        <div className="empty-state">
            <p>There are no {tab} yet, would you like to create one?</p>
            <p>click on the plus icon</p>
            <button className="floating-add" onClick={onCreate} aria-label="Create new">
                <Plus size={56}/>
            </button>
        </div>
    );
}

function ItemCard({item, tab, goals, tasks, active, onClick, onStatusChange}) {
    const parent = goals.find((goal) => goal.id === item.parent_id);
    const isTask = tab === "tasks";

    return (
        <article className={active ? "item-card active" : "item-card"} onClick={onClick}>
            {isTask ? (
                <StatusPicker task={item} onChange={onStatusChange}/>
            ) : (
                <strong
                    className="progress-number">{goalHasAnyTasks(item, goals, tasks) ? calculateGoalProgress(item, goals, tasks) + "%" : "N/A"}</strong>
            )}

            <div className="card-main">
                <small>{isTask ? `${topGoalName(parent, goals)} >> ... >> ${parent.name}` : item.responsibility || "N/A"}</small>
                <h2>{item.name}</h2>
                <p>{isTask ? item.content || "No content yet" : item.summary || "No summary yet"}</p>
            </div>

            <div className="card-meta">
                {!isTask && <span className="priority-badge">{item.priority}</span>}
                {isTask && <span>{formatDate(item.started)}</span>}
                <strong>{formatDate(isTask ? taskEndDate(item, goals) : item.deadline)}</strong>
            </div>
        </article>
    );
}

function StatusPicker({task, onChange}) {
    const [open, setOpen] = useState(false);

    const statuses = [
        ["IN_PROGRESS", "In progress"],
        ["DONE", "Done"],
        ["BLOCKED", "Blocked"]
    ];

    useEffect(() => {
        if (!open) return;

        function close() {
            setOpen(false);
        }

        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [open]);


    return (
        <div className="status-box" onClick={(event) => event.stopPropagation()}>
            <button className={`status-current ${task.status?.toLowerCase()}`}
                    onClick={() => setOpen((value) => !value)}>
                {statusIcons[task.status] || statusIcons.NOT_STARTED}
            </button>
            {open && (
                <div className="status-menu">
                    {statuses.map(([status, label]) => (
                        <button key={status} onClick={() => {
                            onChange(task, status);
                            setOpen(false);
                        }}>
                            {statusIcons[status]} {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function DetailPane({item, tab, goals, tasks, onClose, onDelete}) {
    if (!item) {
        return (
            <aside className="detail-pane">
                <p className="muted">Select {tab === "tasks" ? "a task" : "a goal"} to see details.</p>
            </aside>
        );
    }

    const parent = goals.find((goal) => goal.id === item.parent_id);
    const goalTasks = tasks.filter((task) => task.parent_id === item.id);
    const subGoals = goals.filter((goal) => goal.parent_id === item.id);
    const isTask = tab === "tasks";

    return (
        <aside className="detail-pane">
            <div className="detail-actions">
                <button className="ghost-button" title="Edit">
                    <Edit3/>
                </button>
                <button className="ghost-button danger" title="Delete" onClick={onDelete}>
                    <Trash2/>
                </button>
                <button className="ghost-button" title="Close" onClick={onClose}>
                    <X/>
                </button>
            </div>

            <dl className="detail-list">
                <DetailLine label="Name" value={item.name}/>
                {isTask ? (
                    <>
                        <DetailLine label="Parent goal" value={parent?.name || "None"}/>
                        <DetailLine label="Deadline" value={formatDate(taskEndDate(item, goals))}/>
                        <DetailLine label="Status" value={statusLabels[item.status] || item.status || "Not started"}/>
                        <DetailLine label="Started on" value={formatDate(item.started)}/>
                        <DetailLine label="Content" value={item.content || "None"}/>
                        <DetailLine label="Top goal" value={topGoalName(parent, goals)}/>
                        <DetailLine label="Length" value={`${item.length || 0} days`}/>
                        <DetailLine label="Dependencies" value={dependencyNames(item.dependencies, tasks)}/>
                        <DetailLine label="Notes" value={item.notes || "None"}/>
                    </>
                ) : (
                    <>
                        <DetailLine label="Responsibility" value={item.responsibility || "N/A"}/>
                        <DetailLine label="Deadline" value={formatDate(item.deadline)}/>
                        <DetailLine label="Priority" value={item.priority}/>
                        <DetailLine label="Summary" value={item.summary || "None"}/>
                        <DetailLine label="Parent goal" value={parent?.name || "None"}/>
                        <DetailLine label="Sub-goals"
                                    value={subGoals.length ? subGoals.map((goal) => goal.name).join(", ") : "None"}/>
                        <DetailLine label="Sub-tasks"
                                    value={goalTasks.length ? goalTasks.map((task) => task.name).join(", ") : "None"}/>
                        <DetailLine label="Done"
                                    value={goalHasAnyTasks(item, goals, tasks) ? calculateGoalProgress(item, goals, tasks) + "%" : "N/A"}/>
                        <DetailLine label="Notes" value={item.notes || "None"}/>
                    </>
                )}
            </dl>
        </aside>
    );
}

function DetailLine({label, value}) {
    return (
        <div className="detail-line">
            <dt>{label}:</dt>
            <dd>{value}</dd>
        </div>
    );
}

function GoalModal({goals, onClose, onSubmit}) {
    const [form, setForm] = useState({
        name: "",
        responsibility: "",
        summary: "",
        deadline: "",
        parent_id: "",
        priority: 5,
        notes: ""
    });

    function submit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    return (
        <Modal title="New Goal" onClose={onClose}>
            <form className="entry-form" onSubmit={submit}>
                <Field label="Name" required>
                    <input required maxLength={100} value={form.name}
                           onChange={(e) => setForm({...form, name: e.target.value})}/>
                </Field>
                <Field label="Responsibility">
                    <input maxLength={100} value={form.responsibility}
                           onChange={(e) => setForm({...form, responsibility: e.target.value})}/>
                </Field>
                <Field label="Summary">
                    <textarea maxLength={350} value={form.summary}
                              onChange={(e) => setForm({...form, summary: e.target.value})}/>
                </Field>
                <Field label="Deadline" required>
                    <input required type="date" value={form.deadline}
                           onChange={(e) => setForm({...form, deadline: e.target.value})}/>
                </Field>
                <Field label="Parent goal">
                    <select value={form.parent_id} onChange={(e) => setForm({...form, parent_id: e.target.value})}>
                        <option value="">None</option>
                        {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                    </select>
                </Field>
                <Field label="Priority" required>
                    <input type="number" min="1" max="10" value={form.priority}
                           onChange={(e) => setForm({...form, priority: e.target.value})}/>
                </Field>
                <Field label="Notes">
                    <textarea maxLength={350} value={form.notes}
                              onChange={(e) => setForm({...form, notes: e.target.value})}/>
                </Field>
                <button className="confirm" type="submit">Confirm</button>
            </form>
        </Modal>
    );
}

function TaskModal({goals, tasks, onClose, onSubmit}) {
    const [form, setForm] = useState({
        name: "",
        parent_id: goals[0]?.id || "",
        content: "",
        dependencies: [],
        length: 2,
        notes: ""
    });

    function submit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    function toggleDependency(taskId) {
        setForm((current) => ({
            ...current,
            dependencies: current.dependencies.includes(taskId)
                ? current.dependencies.filter((id) => id !== taskId)
                : [...current.dependencies, taskId]
        }));
    }

    return (
        <Modal title="New Task" onClose={onClose}>
            <form className="entry-form" onSubmit={submit}>
                <Field label="Name" required>
                    <input required maxLength={100} value={form.name}
                           onChange={(e) => setForm({...form, name: e.target.value})}/>
                </Field>
                <Field label="Parent goal" required>
                    <select required value={form.parent_id}
                            onChange={(e) => setForm({...form, parent_id: e.target.value})}>
                        <option value="">Choose a goal</option>
                        {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                    </select>
                </Field>
                <Field label="Content">
                    <textarea maxLength={350} value={form.content}
                              onChange={(e) => setForm({...form, content: e.target.value})}/>
                </Field>
                <Field label="Dependencies">
                    <div className="dependency-box">
                        {tasks.length === 0 && <span className="muted">No tasks available</span>}
                        {tasks.map((task) => (
                            <button
                                type="button"
                                key={task.id}
                                className={form.dependencies.includes(task.id) ? "dependency-pill selected" : "dependency-pill"}
                                onClick={() => toggleDependency(task.id)}
                            >
                                {task.name}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Expected length" required>
                    <div className="inline-input">
                        <input type="number" min="0" value={form.length}
                               onChange={(e) => setForm({...form, length: e.target.value})}/>
                        <span>days</span>
                    </div>
                </Field>
                <Field label="Notes">
                    <textarea maxLength={350} value={form.notes}
                              onChange={(e) => setForm({...form, notes: e.target.value})}/>
                </Field>
                <button className="confirm" type="submit">Confirm</button>
            </form>
        </Modal>
    );
}

function Modal({title, children, onClose}) {
    return (
        <div className="modal-backdrop">
            <section className="modal-card">
                <button className="modal-close" onClick={onClose}><X size={42}/></button>
                <h2>{title}</h2>
                {children}
            </section>
        </div>
    );
}

function Field({label, required, children}) {
    return (
        <label className="field">
            <span>{label}:{required && <sup>*</sup>}</span>
            {children}
        </label>
    );
}

function taskEndDate(task, goals) {
    const parentGoal = goals.find((goal) => goal.id === task.parent_id);
    if (!task.started) return parentGoal?.deadline;
    return Number(task.started) + Number(task.length || 0) * DAY;
}

function topGoalName(goal, goals) {
    if (!goal) return "None";
    let current = goal;
    const guard = new Set();

    while (current?.parent_id && !guard.has(current.id)) {
        guard.add(current.id);
        current = goals.find((candidate) => candidate.id === current.parent_id) || current;
    }

    return current?.name || "None";
}

function dependencyNames(raw, tasks) {
    if (!raw) return "None";
    const ids = raw.split(",").map((id) => id.trim()).filter(Boolean);
    const names = ids.map((id) => tasks.find((task) => task.id === id)?.name || id);
    return names.length ? names.join(", ") : "None";
}

function calculateGoalProgress(goal, goals, tasks = []) {
    const directTasks = tasks.filter((task) => task.parent_id === goal.id);
    const childGoals = goals.filter((candidate) => candidate.parent_id === goal.id);

    const doneDirect = directTasks.filter((task) => task.status === "DONE").length;
    const totalDirect = directTasks.length;

    const childProgress = childGoals.map((child) => calculateGoalProgress(child, goals, tasks));
    const total = totalDirect + childProgress.length;

    if (!total) return 100;

    const done = doneDirect + childProgress.reduce((sum, progress) => sum + progress / 100, 0);
    return Math.round((done / total) * 100);
}

function goalHasAnyTasks(goal, goals, tasks) {
    const directTasks = tasks.some((task) => task.parent_id === goal.id);

    if (directTasks) {
        return true;
    }

    const subGoals = goals.filter((candidate) => candidate.parent_id === goal.id);

    return subGoals.some((subGoal) => goalHasAnyTasks(subGoal, goals, tasks));
}
