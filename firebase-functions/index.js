const { getUsers, updateUserStatus, createPoliceAccount, deletePoliceAccount } = require('./getUsers');

// Export functions for Firebase
exports.getUsers = getUsers;
exports.updateUserStatus = updateUserStatus;
exports.createPoliceAccount = createPoliceAccount;
exports.deletePoliceAccount = deletePoliceAccount;
