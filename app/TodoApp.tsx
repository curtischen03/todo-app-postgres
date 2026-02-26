"use client";
import React, { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { supabase } from "./supabase-client";
import "./TodoApp.css";

interface Todo {
  id: number;
  title: string;
  description: string;
  isCompleted?: boolean;
}

const TodoApp: React.FC = () => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [userId, setUserId] = useState<string>("");

  // --- Frontend-only Edit State ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");

  const fetchUser = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error fetching user:", userError);
      return;
    }
    if (user) {
      console.log("User Id:", user.id);
      setUserId(user.id);
    }
    return user?.id;
  };

  const fetchTasks = async (userId: string) => {
    const { error: taskError, data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true })
      .eq("user_id", userId);
    if (taskError) {
      console.error("Error fetching tasks:", taskError);
      return;
    }
    setTodos(data || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      const userId = await fetchUser();
      await fetchTasks(userId || "");
    };
    fetchData();
  }, []);

  const addTask = async (): Promise<void> => {
    if (title.trim() === "") return;
    const newTodo: Todo = {
      id: Date.now(),
      title,
      description,
      isCompleted: false,
    };

    const { error } = await supabase
      .from("tasks")
      .insert({ title, description, user_id: userId });
    if (error) return console.error("Error adding task:", error);

    setTodos([...todos, newTodo]);
    setTitle("");
    setDescription("");
  };

  const deleteTask = async (id: number): Promise<void> => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return console.error("Error deleting task:", error);
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  // --- Frontend-only Update Logic ---
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDesc(todo.description);
  };

  const saveEdit = async (id: number) => {
    const { error } = await supabase
      .from("tasks")
      .update({ title: editTitle, description: editDesc })
      .eq("id", id);

    if (error) return console.error("Error updating task:", error);
    setTodos(
      todos.map((t) =>
        t.id === id ? { ...t, title: editTitle, description: editDesc } : t,
      ),
    );
    setEditingId(null);
  };

  const toggleComplete = (id: number): void => {
    setTodos(
      todos.map((t) =>
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t,
      ),
    );
  };

  return (
    <div className="todo-container">
      <h2>Task Manager</h2>
      <div className="input-group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Title..."
          className="title-input"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (Optional)..."
          className="desc-input"
        />
        <button className="add-btn" onClick={addTask}>
          Add Task
        </button>
      </div>

      <ul className="todo-list">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className={`todo-item ${todo.isCompleted ? "completed" : ""}`}
          >
            {editingId === todo.id ? (
              // EDIT MODE UI
              <div className="edit-mode-container">
                <input
                  className="edit-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  className="edit-desc-input"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
                <div className="edit-actions">
                  <button
                    className="save-btn"
                    onClick={() => saveEdit(todo.id)}
                  >
                    Save
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // VIEW MODE UI
              <>
                <div
                  className="todo-content"
                  onClick={() => toggleComplete(todo.id)}
                >
                  <strong>{todo.title}</strong>
                  {todo.description && <p>{todo.description}</p>}
                </div>
                <div className="item-actions">
                  <button
                    className="edit-btn"
                    onClick={() => startEditing(todo)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteTask(todo.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoApp;
