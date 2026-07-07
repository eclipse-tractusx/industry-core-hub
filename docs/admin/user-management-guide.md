# User Management via Keycloak

## Overview

This guide explains how to create and manage users through Keycloak instances in the Industry Core Hub system. Keycloak is an open-source identity and access management (IAM) solution that handles user authentication and authorization for the application.

## Accessing the Keycloak Admin Console

1. Navigate to your Keycloak instance URL (typically `http://localhost:8080/auth/admin` for local development or the configured domain for production)
2. Click on **Administration Console** or navigate directly to the Admin Console URL
3. Log in with your Keycloak administrator credentials
4. **Select the ICHub Realm** - In the top-left corner, you'll see a dropdown showing the current realm. Click it and select **ICHub** from the list to switch to the correct realm for user management

## Creating a New User

### Step-by-Step Instructions

1. **Access the Users Section**
   - In the left sidebar, navigate to **Users**
   - Click the **Add user** button

2. **Fill in User Information**
   - **Username**: Enter a unique username for the user
   - **Email**: (Optional) Enter the user's email address
   - **First Name**: (Optional) Enter the user's first name
   - **Last Name**: (Optional) Enter the user's last name
   - **Enabled**: Toggle to enable the user (must be enabled for login)

3. **Create the User**
   - Click **Create** to save the new user

4. **Set User Password**
   - After creation, the user will appear in the users list
   - Click on the user to open their profile
   - Navigate to the **Credentials** tab
   - Click **Set Password**
   - Enter and confirm the temporary password
   - Toggle **Temporary** to `ON` if you want the user to change the password on first login
   - Click **Set Password** to confirm

5. **Assign Roles (Optional)**
   - In the user profile, go to the **Role Mappings** tab
   - Select roles appropriate for the user's responsibilities
   - Available roles depend on your system configuration

## User Login

Once a user account is created and a password is set, the user can log in using:

- **Username**: The username created in step 2 above
- **Password**: The password set in the credentials section
- **Access URL**: Direct them to your application's login page or Keycloak login page

### First-Time Login

If you set the password as **Temporary**:
1. The user will be prompted to change their password on first login
2. Enter the temporary password provided during user creation
3. Enter a new permanent password
4. The user is now logged in with their permanent password

## User Management Best Practices

### Security

- **Strong Passwords**: Encourage users to set strong passwords
- **Password Expiration**: Configure password expiration policies in Keycloak settings
- **MFA (Multi-Factor Authentication)**: Consider enabling MFA for additional security
- **Regular Audits**: Periodically review active users and remove inactive accounts

### Organization

- **Naming Convention**: Use a consistent naming convention for usernames (e.g., `firstname.lastname`)
- **Email Verification**: Enable email verification to confirm user email addresses
- **User Groups**: Organize users into groups for easier role management

### Maintenance

- **Disable Instead of Delete**: Disable inactive users instead of deleting them for audit purposes
- **Backup**: Regularly backup your Keycloak instance and user data
- **Documentation**: Keep records of user creations and role assignments

## Editing Existing Users

1. Go to **Users** in the admin console
2. Search for and click on the user to edit
3. Modify the user's information as needed:
   - Personal details (email, first name, last name)
   - Enable/Disable status
   - Credentials and password
   - Role mappings
   - User attributes

## Disabling or Deleting Users

### To Disable a User (Recommended)

1. Navigate to **Users** and select the user
2. Toggle **Enabled** to `OFF`
3. Click **Save**
   - The user will no longer be able to log in

### To Delete a User

1. Navigate to **Users** and select the user
2. Click the **Delete** button (top right)
3. Confirm the deletion
   - Note: This action is permanent

## Troubleshooting

### User Cannot Log In

- **Check if enabled**: Verify the user account is enabled
- **Check password**: Use "Set Password" to reset the user's password
- **Check realm**: Ensure the user is in the correct realm/environment

### Password Reset Issues

- Go to user profile → **Credentials** tab
- Click **Reset** next to the password section
- Set a new temporary or permanent password

### User Not Seeing Expected Roles

- Check **Role Mappings** tab in the user profile
- Verify the roles are assigned and enabled
- Check if the roles are mapped in the application configuration

## Additional Resources

- [Keycloak Official Documentation](https://www.keycloak.org/documentation)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Project Architecture Documentation](../architecture/README.md)

# NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

* SPDX-License-Identifier: CC-BY-4.0
* SPDX-FileCopyrightText: 2026 LKS Next
* SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
* Source URL: <https://github.com/eclipse-tractusx/industry-core-hub>
