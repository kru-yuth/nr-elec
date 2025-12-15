import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'users';

export const userService = {
    // Get all users (for Admin)
    getAllUsers: async () => {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    // Update user role
    updateUserRole: async (uid, newRole) => {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, {
            role: newRole
        });
    },

    // Get user profile
    getUserProfile: async (uid) => {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    }
};
