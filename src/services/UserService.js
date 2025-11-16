import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updateEmail, deleteUser } from "firebase/auth";
import { getFirestore, doc, updateDoc, deleteDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

export const UserService = {
  /**
   * Update user email in both Firebase Auth and Firestore
   * @param {string} newEmail - The new email to set
   * @param {string} password - Current password for reauthentication
   */
  async updateUserEmail(newEmail, password) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    try {
      // Reauthenticate first (required by Firebase for sensitive actions)
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Update email in Firebase Authentication
      await updateEmail(user, newEmail);

      // Update email in Firestore (users collection)
      await updateDoc(doc(db, "users", user.uid), {
        email: newEmail,
      });

      console.log("✅ Email updated in Auth and Firestore");
    } catch (error) {
      console.error("❌ Failed to update email:", error);
      throw error;
    }
  },

  /**
   * Delete user from both Firebase Auth and Firestore
   * @param {string} password - Current password for reauthentication
   */
  async deleteUserAccount(password) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Delete Firestore user document
      await deleteDoc(doc(db, "users", user.uid));

      // Delete user from Firebase Auth
      await deleteUser(user);

      console.log("✅ User deleted from Auth and Firestore");
    } catch (error) {
      console.error("❌ Failed to delete user:", error);
      throw error;
    }
  },

  /**
   * Update user details in Firestore
   * @param {string} userId - The user ID to update
   * @param {object} updateData - The data to update
   */
  async updateUserDetails(userId, updateData) {
    try {
      // Add last_updated timestamp
      const dataToUpdate = {
        ...updateData,
        last_updated: new Date()
      };

      await updateDoc(doc(db, "users", userId), dataToUpdate);
      console.log("✅ User details updated in Firestore");
      return dataToUpdate;
    } catch (error) {
      console.error("❌ Failed to update user details:", error);
      throw error;
    }
  },
};