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
    const [authError, setAuthError] = useState(null);

    async function login() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            hd: "nr.ac.th"
        });
        setAuthError(null);

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if email domain is allowed
            if (!user.email.endsWith('@nr.ac.th')) {
                await signOut(auth);
                const err = new Error("อนุญาตเฉพาะอีเมล @nr.ac.th เท่านั้น");
                setAuthError(err.message);
                throw err;
            }

            // Strict Email-based Lookup (Unified Flow)
            const foundUser = await userService.findUserByEmail(user.email);
            
            if (foundUser) {
                // Link UID if missing or update existing UID doc
                await userService.linkUidToEmailDoc(user.email, user.uid, foundUser);
                
                const updatedProfile = await userService.getUserProfile(user.uid);
                setUserRoles(updatedProfile.roles);
                setCurrentUser(user);
                return user;
            } else {
                await signOut(auth);
                const err = new Error("ไม่พบข้อมูลผู้ใช้งานในระบบ กรุณาติดต่อผู้ดูแลระบบ");
                setAuthError(err.message);
                throw err;
            }
        } catch (error) {
            console.error("Login Error:", error);
            if (!authError) setAuthError(error.message);
            throw error;
        }
    }

    function logout() {
        setAuthError(null);
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email.endsWith('@nr.ac.th')) {
                try {
                    const profile = await userService.getUserProfile(user.uid);
                    
                    if (profile && profile.roles && profile.roles.length > 0) {
                        setCurrentUser(user);
                        setUserRoles(profile.roles);
                    } else {
                        // Check email linking if UID doc not yet created
                        const foundUser = await userService.findUserByEmail(user.email);
                        if (foundUser) {
                             await userService.linkUidToEmailDoc(user.email, user.uid, foundUser);
                             const updatedProfile = await userService.getUserProfile(user.uid);
                             setCurrentUser(user);
                             setUserRoles(updatedProfile.roles);
                        } else {
                            await signOut(auth);
                            setCurrentUser(null);
                            setUserRoles([]);
                        }
                    }
                } catch (e) {
                    console.error("Auth State Change Error", e);
                    if (e.code === 'permission-denied') {
                        setAuthError("Permission Denied: Unable to fetch user profile.");
                    } else {
                        setCurrentUser(null);
                        setUserRoles([]);
                    }
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
        role: userRoles[0] || null, 
        userRole: userRoles[0] || null, 
        authError,
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
