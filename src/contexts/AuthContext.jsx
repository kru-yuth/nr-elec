import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { normalizeRoles, userService } from '../services/userService';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRoles, setUserRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    async function login() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            hd: "nr.ac.th"
        });

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if email domain is allowed
            if (!user.email.endsWith('@nr.ac.th')) {
                await signOut(auth);
                throw new Error("อนุญาตเฉพาะอีเมล @nr.ac.th เท่านั้น");
            }

            // 1. Try to find user by UID
            const userDocRef = doc(db, "users", user.uid);
            let userDoc = await getDoc(userDocRef);

            // 2. If not found by UID, try to find by Email (UID Linking)
            if (!userDoc.exists()) {
                const foundUser = await userService.findUserByEmail(user.email);
                
                if (foundUser) {
                    // Link UID: Create/Update doc with UID as ID
                    await setDoc(userDocRef, {
                        ...foundUser,
                        uid: user.uid,
                        roles: normalizeRoles(foundUser),
                        role: deleteField(),
                        Role: deleteField()
                    }, { merge: true });
                    
                    userDoc = await getDoc(userDocRef);
                } else {
                    // Check for email as doc ID (Legacy fallback)
                    const emailDocRef = doc(db, "users", user.email);
                    const emailDoc = await getDoc(emailDocRef);
                    
                    if (emailDoc.exists()) {
                        const legacyData = emailDoc.data();
                        await setDoc(userDocRef, {
                            ...legacyData,
                            email: user.email,
                            uid: user.uid,
                            roles: normalizeRoles(legacyData),
                            role: deleteField(),
                            Role: deleteField()
                        });
                        userDoc = await getDoc(userDocRef);
                    } else {
                        await signOut(auth);
                        throw new Error("ผู้ใช้งานไม่มีสิทธิ์เข้าถึงระบบ กรุณาติดต่อผู้ดูแลระบบ");
                    }
                }
            }

            const userData = userDoc.data();
            setUserRoles(normalizeRoles(userData));
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
            if (user && user.email.endsWith('@nr.ac.th')) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setCurrentUser(user);
                        setUserRoles(normalizeRoles(data));
                    } else {
                        // Check email linking if UID doc not yet created
                        const foundUser = await userService.findUserByEmail(user.email);
                        if (foundUser) {
                             setCurrentUser(user);
                             setUserRoles(normalizeRoles(foundUser));
                        } else {
                            await signOut(auth);
                            setCurrentUser(null);
                            setUserRoles([]);
                        }
                    }
                } catch (e) {
                    console.error("Auth State Change Error", e);
                    setCurrentUser(null);
                    setUserRoles([]);
                }
            } else {
                setCurrentUser(null);
                setUserRoles([]);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        roles: userRoles,
        role: userRoles.length > 0 ? userRoles[0] : null, // Fallback for old UI
        userRole: userRoles.length > 0 ? userRoles[0] : null, // Second fallback
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
