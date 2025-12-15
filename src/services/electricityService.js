import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'electricity_records';

export const electricityService = {
    // Add a new record with validation
    addRecord: async (data, userId) => {
        // 1. Validate Duplicate (user_number + month + year)
        const isDuplicate = await electricityService.checkDuplicate(
            data.user_number,
            data.month,
            data.year
        );

        if (isDuplicate) {
            throw new Error(`มีข้อมูลของผู้ใช้ ${data.user_number} ในเดือน ${data.month}/${data.year} อยู่แล้ว`);
        }

        // 2. Add Record
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            created_by: userId,
            record_date: Timestamp.now()
        });

        return docRef.id;
    },

    // Update an existing record
    updateRecord: async (id, data) => {
        // Note: If updating month/year/user_number, we should ideally check for duplicates again,
        // excluding the current record. For MVP, assuming careful editing.
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
    },

    // Delete a record
    deleteRecord: async (id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    },

    // Get all records (can add filters)
    getRecords: async (filters = {}) => {
        let q = collection(db, COLLECTION_NAME);
        const constraints = [];

        if (filters.year) {
            constraints.push(where("year", "==", Number(filters.year)));
        }
        if (filters.month) {
            constraints.push(where("month", "==", Number(filters.month)));
        }
        if (filters.user_number) {
            constraints.push(where("user_number", "==", filters.user_number));
        }

        q = query(q, ...constraints);

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by year desc, then month desc (Client-side to avoid Index issues)
        return results.sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });
    },

    // Get single record by ID
    getRecordById: async (id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    },

    // Check for duplicate record
    checkDuplicate: async (user_number, month, year) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("user_number", "==", String(user_number)), // Ensure string comparison
            where("month", "==", Number(month)),
            where("year", "==", Number(year))
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    },

    // Batch insert records
    batchAddRecords: async (records, userId) => {
        const results = {
            success: 0,
            errors: [],
            duplicates: 0
        };

        // Note: Firestore batch limit is 500. If CSV is huge, consider chunking.
        // For MVP, we'll process sequentially or in parallel batches to handle duplicates properly.
        // Sequential is safer to report exact errors per row.

        for (const [index, record] of records.entries()) {
            try {
                // 1. Check duplicate
                const isDuplicate = await electricityService.checkDuplicate(
                    record.user_number,
                    record.month,
                    record.year
                );

                if (isDuplicate) {
                    results.duplicates++;
                    results.errors.push(`แถวที่ ${index + 1}: ข้อมูลซ้ำสำหรับ ${record.user_number} - ${record.month}/${record.year}`);
                    continue;
                }

                // 2. Add
                await addDoc(collection(db, COLLECTION_NAME), {
                    ...record,
                    created_by: userId,
                    record_date: Timestamp.now()
                });
                results.success++;

            } catch (error) {
                results.errors.push(`แถวที่ ${index + 1}: เกิดข้อผิดพลาด - ${error.message}`);
            }
        }

        return results;
    }
};
