"use client";
import React, { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { supabase } from "./supabase-client";
import TodoApp from "./TodoApp";
import Login from "./Login";
import "./TodoApp.css";

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const currentSession = await supabase.auth.getSession();
      console.log("Current session:", currentSession);
      setSession(currentSession.data.session);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <div>
      {session ? (
        <div>
          <button className="logout-btn" onClick={() => logout()}>
            Logout
          </button>
          <TodoApp session={session} />
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
}
