import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export const signInAdmin = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (!email.endsWith('@admin.com')) {
    throw new Error('Access restricted to admin users only.');
  }

  return user;
};
