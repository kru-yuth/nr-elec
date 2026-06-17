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
    if (!userData) return [];
    
    const rolesSet = new Set();
    
    // Add existing roles array if present
    if (Array.isArray(userData.roles)) {
        userData.roles.forEach(r => rolesSet.add(String(r).toLowerCase().trim()));
    }
    
    // Add legacy role/Role fields
    if (userData.role) rolesSet.add(String(userData.role).toLowerCase().trim());
    if (userData.Role) rolesSet.add(String(userData.Role).toLowerCase().trim());
    
    const finalRoles = Array.from(rolesSet).filter(Boolean);
    return finalRoles;
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
                roles: normalizeRoles(data),
                status: data.status || 'active'
            };
        });
    },

    // Update user roles and status (Unified)
    updateUser: async (uid, updates) => {
        const userRef = doc(db, COLLECTION_NAME, uid);
        
        const finalUpdates = { ...updates, updatedAt: new Date().toISOString() };
        
        if (updates.roles) {
            const cleanRoles = Array.isArray(updates.roles) 
                ? [...new Set(updates.roles.map(r => String(r).toLowerCase().trim()))]
                : [String(updates.roles).toLowerCase().trim()];
            
            finalUpdates.roles = cleanRoles;
            // Keep legacy fields updated for backward compatibility instead of deleting
            if (cleanRoles.length > 0) {
                finalUpdates.role = cleanRoles[0];
                finalUpdates.Role = cleanRoles[0];
            }
        }

        await updateDoc(userRef, finalUpdates);
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
                roles: normalizeRoles(data),
                status: data.status || 'active'
            };
        }
        return null;
    },

    // Find user by email (for UID Linking) - Uses Query as requested
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
        const userRef = doc(db, COLLECTION_NAME, uid);
        
        await setDoc(userRef, {
            ...userData,
            email: email, // Ensure email is set
            uid: uid,
            roles: roles,
            status: userData.status || 'active',
            role: roles.length > 0 ? roles[0] : 'student',
            Role: roles.length > 0 ? roles[0] : 'student',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // If the old doc ID was the email, we might want to delete it or leave it.
        // For this refactor, we transition to UID as primary key.
    }
};
