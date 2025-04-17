// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// สร้าง Context
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // เก็บ user object จาก Firebase
  const [role, setRole] = useState(""); // เก็บ role จาก Firestore
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role || "");
        }
      } else {
        setRole("");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ใช้งานง่าย ๆ
export function useAuth() {
  return useContext(AuthContext);
}
