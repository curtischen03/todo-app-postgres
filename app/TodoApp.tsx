"use client";
import React, { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { supabase } from "./supabase-client";
import "./TodoApp.css";

interface Todo {
  id: number;
  title: string;
  description: string;
  isCompleted?: boolean;
  imageUrl: string | null;
}

interface TodoAppProps {
  session: any;
}

const TodoApp: React.FC<TodoAppProps> = ({ session }) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [userId, setUserId] = useState<string>(session.user.id);

  // --- Frontend-only Edit State ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [taskImage, setTaskImage] = useState<File | null>(null);

  const fetchTasks = async () => {
    const { error: taskError, data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true })
      .eq("user_id", userId);
    if (taskError) {
      console.error("Error fetching tasks:", taskError);
      return;
    }
    const mapped_data = data.map((obj) => ({
      id: obj.id,
      title: obj.title,
      description: obj.description,
      isCompleted: false,
      imageUrl: obj.image_url,
    }));
    setTodos(mapped_data || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchTasks();
    };
    fetchData();
  }, []);

  useEffect(() => {
    const channel = supabase.channel("tasks-channel");
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          console.log("New task added:", payload.new);
          setTodos((prev) => [
            ...prev,
            {
              id: payload.new.id,
              title: payload.new.title,
              description: payload.new.description,
              imageUrl: payload.new.image_url,
              isCompleted: false,
            },
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        (payload) => {
          console.log("New task deleted:", payload.old);
          setTodos((prev) => prev.filter((t) => t.id !== payload.old.id));
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    const filePath = `${file.name}-${Date.now()}`;
    const { error } = await supabase.storage
      .from("tasks-images")
      .upload(filePath, file);
    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    const { data } = await supabase.storage
      .from("tasks-images")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };
  const addTask = async (): Promise<void> => {
    let imageUrl: string | null = null;
    if (taskImage) {
      imageUrl = await uploadImage(taskImage);
      console.log("Uploaded image URL:", imageUrl);
    }
    if (title.trim() === "") return;
    const newTodo: Todo = {
      id: Date.now(),
      title,
      description,
      imageUrl: imageUrl,
      isCompleted: false,
    };

    const { error } = await supabase
      .from("tasks")
      .insert({ title, description, user_id: userId, image_url: imageUrl });
    if (error) return console.error("Error adding task:", error);

    //setTodos([...todos, newTodo]);
    setTitle("");
    setDescription("");
    setTaskImage(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setTaskImage(e.target.files[0]);
    }
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
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="inputFile"
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
                  {todo.imageUrl && (
                    <img src={todo.imageUrl} className="todoImg" />
                  )}
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
