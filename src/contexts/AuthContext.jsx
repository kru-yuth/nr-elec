import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    async function login() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            hd: "nr.ac.th"
        });

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if email domain is allowed (double check client side)
            if (!user.email.endsWith('@nr.ac.th')) {
                await signOut(auth);
                throw new Error("อนุญาตเฉพาะอีเมล @nr.ac.th เท่านั้น");
            }

            // Check whitelist in Firestore
            const userDocRef = doc(db, "users", user.uid); // Assuming UID is used, or query by email
            // Note: The requirement says "UID/Email in Collection users". 
            // Usually it's better to check by email if the users are pre-seeded without UIDs.
            // But let's assume we check by UID first, if not found, maybe check by email?
            // For strict whitelist, usually the admin adds the email and we query by email.
            // However, to keep it simple and standard, let's assume the doc ID is the UID or we query.
            // Let's try to get doc by UID first.

            let userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // If not found by UID, maybe we need to find by email and link?
                // For this MVP, let's assume the user must exist. 
                // Or maybe we just check if the email is in a whitelist collection?
                // The requirement says: "User Whitelist (อนุญาตให้เข้าใช้งานเฉพาะ UID/Email ที่มีใน Collection users เท่านั้น)"
                // Let's assume we query the 'users' collection where email == user.email
                // But since we can't query easily without index, let's stick to a simple check or assume doc ID is UID.
                // IF the admin adds users by Email, they won't know the UID beforehand.
                // SO, the 'users' collection probably uses Email as ID or has an email field.
                // Let's assume the doc ID is the EMAIL for simplicity in whitelist management, OR we query.
                // Let's try to get doc by Email.
                const emailDocRef = doc(db, "users", user.email);
                const emailDoc = await getDoc(emailDocRef);

                if (emailDoc.exists()) {
                    userDoc = emailDoc;
                } else {
                    // If neither UID nor Email doc exists
                    await signOut(auth);
                    throw new Error("ผู้ใช้งานไม่มีสิทธิ์เข้าถึงระบบ กรุณาติดต่อผู้ดูแลระบบ");
                }
            }

            setUserRole(userDoc.data().role || 'user');
            return user;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (!user.email.endsWith('@nr.ac.th')) {
                    await signOut(auth);
                    setCurrentUser(null);
                    setUserRole(null);
                    setLoading(false);
                    return;
                }

                // Fetch role again to be sure
                try {
                    // Logic to find user doc again
                    let role = 'user';
                    const userDocRef = doc(db, "users", user.uid);
                    let userDoc = await getDoc(userDocRef);
                    if (!userDoc.exists()) {
                        const emailDocRef = doc(db, "users", user.email);
                        const emailDoc = await getDoc(emailDocRef);
                        if (emailDoc.exists()) {
                            userDoc = emailDoc;
                        }
                    }

                    if (userDoc.exists()) {
                        role = userDoc.data().role || 'user';
                        setCurrentUser(user);
                        setUserRole(role);
                    } else {
                        // Not in whitelist
                        await signOut(auth);
                        setCurrentUser(null);
                        setUserRole(null);
                    }
                } catch (e) {
                    console.error("Auth State Change Error", e);
                    setCurrentUser(null);
                    setUserRole(null);
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
