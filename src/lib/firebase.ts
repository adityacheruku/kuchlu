import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCUaG374Y6rwIKBAstOEEeXns52cUknIeY",
    authDomain: "kuchlu-8791e.firebaseapp.com",
    projectId: "kuchlu-8791e",
    storageBucket: "kuchlu-8791e.firebasestorage.app",
    messagingSenderId: "300096412124",
    appId: "1:300096412124:android:859e7dfd6f71039799d719"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable phone auth persistence
auth.useDeviceLanguage();

export const createRecaptchaVerifier = (containerId: string) => {
    return new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
            console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
            console.log('reCAPTCHA expired');
        }
    });
};

export const sendOTP = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        return confirmationResult;
    } catch (error: any) {
        console.error('Error sending OTP:', error);
        throw new Error(error.message || 'Failed to send OTP');
    }
};

export const verifyOTP = async (confirmationResult: any, otp: string) => {
    try {
        const result = await confirmationResult.confirm(otp);
        return result;
    } catch (error: any) {
        console.error('Error verifying OTP:', error);
        throw new Error(error.message || 'Invalid OTP');
    }
};

export const getFirebaseToken = async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No authenticated user');
        }
        const token = await user.getIdToken(true);
        return token;
    } catch (error: any) {
        console.error('Error getting Firebase token:', error);
        throw new Error(error.message || 'Failed to get authentication token');
    }
};

export const signOut = async () => {
    try {
        await auth.signOut();
    } catch (error: any) {
        console.error('Error signing out:', error);
        throw new Error(error.message || 'Failed to sign out');
    }
}; 