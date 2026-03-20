import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    query,
    where,
    limit,
    deleteField
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'users';

/**
 * Helper to normalize legacy role fields into a roles array
 * @param {Object} userData - Data from Firestore
 * @returns {Array} - Cleaned array of roles
 */
export const normalizeRoles = (userData) => {
    if (!userData) return ['user'];
    
    const rolesSet = new Set();
    
    // Add existing roles array if present
    if (Array.isArray(userData.roles)) {
        userData.roles.forEach(r => rolesSet.add(String(r).toLowerCase()));
    }
    
    // Add legacy role/Role fields
    if (userData.role) rolesSet.add(String(userData.role).toLowerCase());
    if (userData.Role) rolesSet.add(String(userData.Role).toLowerCase());
    
    const finalRoles = Array.from(rolesSet).filter(Boolean);
    return finalRoles.length > 0 ? finalRoles : ['user'];
};

export const userService = {
    // Get all users (for Admin)
    getAllUsers: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                roles: normalizeRoles(data)
            };
        });
    },

    // Update user roles (Unified)
    updateUserRoles: async (uid, newRoles) => {
        const userRef = doc(db, COLLECTION_NAME, uid);
        
        // Ensure newRoles is an array of lowercase strings
        const cleanedRoles = Array.isArray(newRoles) 
            ? [...new Set(newRoles.map(r => String(r).toLowerCase()))]
            : [String(newRoles).toLowerCase()];

        await updateDoc(userRef, {
            roles: cleanedRoles,
            role: deleteField(), // Clean up legacy field
            Role: deleteField()  // Clean up legacy field
        });
    },

    // Backward compatibility wrapper
    updateUserRole: async (uid, newRole) => {
        return userService.updateUserRoles(uid, [newRole]);
    },

    // Get user profile with normalization
    getUserProfile: async (uid) => {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { 
                id: docSnap.id, 
                ...data, 
                roles: normalizeRoles(data) 
            };
        }
        return null;
    },

    // Find user by email (for UID Linking)
    findUserByEmail: async (email) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("email", "==", email),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    },

    // Link UID to existing email document
    linkUidToEmailDoc: async (email, uid, userData) => {
        const roles = normalizeRoles(userData);
        // Create/Update document with UID as ID, and delete the email-based ID if they differ
        const newUserRef = doc(db, COLLECTION_NAME, uid);
        
        await setDoc(newUserRef, {
            ...userData,
            uid: uid,
            roles: roles,
            role: deleteField(),
            Role: deleteField()
        }, { merge: true });

        // If the old doc ID was the email, we might want to delete it or leave it.
        // Usually, we transition to UID as the primary key.
        if (email !== uid) {
            // Optional: delete old email-based doc if needed, 
            // but for safety in this refactor, we'll keep it or assume UID linking is preferred.
        }
    }
};
