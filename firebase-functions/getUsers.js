const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

exports.getUsers = functions.https.onCall(async (data, context) => {
  try {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Get all users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers();
    const users = [];

    listUsersResult.users.forEach(userRecord => {
      // Extract first name from displayName or email
      const firstName = userRecord.displayName || 
                       (userRecord.email ? userRecord.email.split('@')[0] : 'Unknown');
      
      users.push({
        id: userRecord.uid,
        firstName: firstName,
        email: userRecord.email || 'No email',
        createdAt: userRecord.metadata.creationTime,
        isSuspended: userRecord.disabled || false,
        suspendedAt: userRecord.disabled ? userRecord.metadata.lastSignInTime : null,
        suspendedBy: userRecord.disabled ? 'admin@e-responde.com' : null,
        lastSignIn: userRecord.metadata.lastSignInTime
      });
    });

    return { users };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch users');
  }
});

exports.updateUserStatus = functions.https.onCall(async (data, context) => {
  try {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, disabled } = data;

    if (!userId || typeof disabled !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid parameters');
    }

    // Update user in Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: disabled
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user status');
  }
});

exports.createPoliceAccount = functions.https.onCall(async (data, context) => {
  try {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { email, password, firstName, lastName, contactNumber, policeRank, displayName } = data;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !contactNumber || !policeRank) {
      throw new functions.https.HttpsError('invalid-argument', 'All fields are required');
    }

    if (password.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long');
    }

    console.log(`Creating police account for: ${email}`);

    // Create the user using Admin SDK (this doesn't sign them in)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName || `${firstName} ${lastName}`,
      emailVerified: false
    });

    console.log(`Successfully created Firebase Auth user: ${userRecord.uid}`);

    return { 
      success: true, 
      uid: userRecord.uid,
      email: userRecord.email,
      message: 'Police account created successfully' 
    };
  } catch (error) {
    console.error('Error creating police account:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'This email address is already registered');
    }
    
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid email address');
    }
    
    throw new functions.https.HttpsError('internal', `Failed to create police account: ${error.message}`);
  }
});

exports.deletePoliceAccount = functions.https.onCall(async (data, context) => {
  try {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { authUid } = data;

    if (!authUid || typeof authUid !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid authUid parameter');
    }

    console.log(`Attempting to delete Firebase Auth user: ${authUid}`);

    // Delete the user from Firebase Authentication using Admin SDK
    await admin.auth().deleteUser(authUid);

    console.log(`Successfully deleted Firebase Auth user: ${authUid}`);
    return { success: true, message: 'Firebase Auth user deleted successfully' };
  } catch (error) {
    console.error('Error deleting Firebase Auth user:', error);
    
    // If user doesn't exist, consider it successful (already deleted)
    if (error.code === 'auth/user-not-found') {
      console.log('User not found in Firebase Auth, considering deletion successful');
      return { success: true, message: 'User not found in Firebase Auth (may already be deleted)' };
    }
    
    throw new functions.https.HttpsError('internal', `Failed to delete Firebase Auth user: ${error.message}`);
  }
});